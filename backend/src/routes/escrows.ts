import { Router } from "express";
import { Client, Wallet, type EscrowFinish } from "xrpl";
import { STUB_MODE } from "../config.js";
import {
  getEscrowById as getEscrowByIdDb,
  listEscrows as listEscrowsDb,
  releaseEscrow as releaseEscrowDb
} from "../data/dbStore.js";
import { listEscrows as listEscrowsStub, releaseEscrow as releaseEscrowStub } from "../data/stubStore.js";
import { conflict, notFound } from "../httpErrors.js";

const router = Router();

const readEnv = (name: string) => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const requiredEnv = (name: string) => {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing ${name} in backend/.env`);
  }
  return value;
};

// Returns full escrow records for verifier and audit views.
router.get("/", (_req, res) => {
  const escrows = STUB_MODE ? listEscrowsStub() : listEscrowsDb();
  return res.json({ escrows });
});

// Releases an escrow in stub mode and returns the updated escrow payload.
router.post("/:id/release", async (req, res) => {
  const { id } = req.params;

  if (STUB_MODE) {
    const result = releaseEscrowStub(id);
    if (!result) {
      return notFound(res, "Escrow not found");
    }

    if ("alreadyReleased" in result && result.alreadyReleased) {
      return conflict(res, "Escrow already released");
    }

    return res.json({
      message: "Escrow release simulated (stub mode)",
      escrowId: id,
      finishTx: result.finishTx,
      escrow: result.escrow
    });
  }

  const escrow = getEscrowByIdDb(id);
  if (!escrow) {
    return notFound(res, "Escrow not found");
  }

  if (escrow.status === "released") {
    return conflict(res, "Escrow already released");
  }

  if (!escrow.ownerAddress || !Number.isInteger(escrow.offerSequence ?? undefined)) {
    return conflict(res, "Escrow missing ownerAddress/offerSequence for release");
  }

  if (escrow.finishAfter) {
    const finishAfterMs = Date.parse(escrow.finishAfter);
    if (!Number.isNaN(finishAfterMs) && Date.now() < finishAfterMs) {
      return conflict(res, "EscrowFinish failed with result tecNO_PERMISSION", {
        engineResult: "tecNO_PERMISSION"
      });
    }
  }

  const xrplWss = requiredEnv("XRPL_WSS");
  const verifierSeed = requiredEnv("VERIFIER_WALLET_SEED");
  const wallet = Wallet.fromSeed(verifierSeed);
  const client = new Client(xrplWss);

  try {
    await client.connect();
    const tx: EscrowFinish = {
      TransactionType: "EscrowFinish",
      Account: wallet.classicAddress,
      Owner: escrow.ownerAddress,
      OfferSequence: Number(escrow.offerSequence)
    };
    const submitResult = await client.submitAndWait(tx, { wallet });
    const txResult = submitResult.result;
    const engineResult =
      typeof txResult.meta === "object" && txResult.meta && "TransactionResult" in txResult.meta
        ? String(txResult.meta.TransactionResult)
        : "unknown";

    if (engineResult !== "tesSUCCESS") {
      if (engineResult === "tecNO_PERMISSION") {
        return conflict(res, "EscrowFinish failed with result tecNO_PERMISSION", {
          engineResult
        });
      }
      if (engineResult === "tecNO_TARGET") {
        return conflict(res, "EscrowFinish failed with result tecNO_TARGET", {
          engineResult
        });
      }
      return conflict(res, `EscrowFinish failed with result ${engineResult}`, {
        engineResult
      });
    }

    const result = releaseEscrowDb(id, { finishTx: String(txResult.hash) });
    if (!result) {
      return notFound(res, "Escrow not found");
    }

    return res.json({
      message: "Escrow released on XRPL",
      escrowId: id,
      finishTx: result.finishTx,
      escrow: result.escrow
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Escrow release failed"
    });
  } finally {
    if (client.isConnected()) {
      await client.disconnect();
    }
  }
});

export default router;
