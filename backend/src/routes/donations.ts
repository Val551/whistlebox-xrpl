import { Router } from "express";
import {
  Client,
  Wallet,
  isoTimeToRippleTime,
  xrpToDrops,
  isValidClassicAddress,
  type EscrowCreate
} from "xrpl";
import { STUB_MODE } from "../config.js";
import {
  createDonation as createDonationDb,
  findDonationByPaymentTx as findDonationByPaymentTxDb,
  getCampaignSummary as getCampaignSummaryDb
} from "../data/dbStore.js";
import {
  createDonation as createDonationStub,
  findDonationByPaymentTx as findDonationByPaymentTxStub
} from "../data/stubStore.js";
import { badRequest, conflict } from "../httpErrors.js";

const router = Router();

type ApiError = {
  status: number;
  message: string;
  details?: Record<string, unknown>;
};

const readEnv = (name: string) => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const requiredEnv = (name: string) => {
  const value = readEnv(name);
  if (!value) {
    throw { status: 500, message: `Missing ${name} in backend/.env` } as ApiError;
  }
  return value;
};

const toApiError = (error: unknown): ApiError =>
  typeof error === "object" && error !== null && "status" in error && "message" in error
    ? (error as ApiError)
    : { status: 500, message: error instanceof Error ? error.message : "Donation failed" };

const submitEscrowCreate = async (amountXrp: number, destinationAddress: string) => {
  const xrplWss = requiredEnv("XRPL_WSS");
  const custodySeed = requiredEnv("CUSTODY_WALLET_SEED");
  const finishAfterSecondsEnv = readEnv("XRPL_ESCROW_FINISH_AFTER_SECONDS");
  const finishAfterSeconds = Number(
    finishAfterSecondsEnv ??
      (() => {
        const minutes = Number(readEnv("XRPL_ESCROW_FINISH_AFTER_MINUTES") ?? "3");
        return String(minutes * 60);
      })()
  );
  if (!Number.isFinite(finishAfterSeconds) || finishAfterSeconds < 1) {
    throw { status: 500, message: "Invalid XRPL_ESCROW_FINISH_AFTER_SECONDS" } as ApiError;
  }

  const amountDrops = xrpToDrops(String(amountXrp));
  const finishAfterDate = new Date(Date.now() + finishAfterSeconds * 1000);
  const finishAfterIso = finishAfterDate.toISOString();
  const finishAfterRipple = isoTimeToRippleTime(finishAfterIso);
  const wallet = Wallet.fromSeed(custodySeed);

  const client = new Client(xrplWss);
  await client.connect();
  try {
    const tx: EscrowCreate = {
      TransactionType: "EscrowCreate",
      Account: wallet.classicAddress,
      Destination: destinationAddress,
      Amount: amountDrops,
      FinishAfter: finishAfterRipple
    };

    const submitResult = await client.submitAndWait(tx, { wallet });
    const txResult = submitResult.result;
    const engineResult =
      typeof txResult.meta === "object" && txResult.meta && "TransactionResult" in txResult.meta
        ? String(txResult.meta.TransactionResult)
        : "unknown";
    if (engineResult !== "tesSUCCESS") {
      throw {
        status: 409,
        message: `EscrowCreate failed with result ${engineResult}`,
        details: { engineResult }
      } as ApiError;
    }

    return {
      escrowCreateTx: String(txResult.hash),
      ownerAddress: wallet.classicAddress,
      destinationAddress,
      finishAfter: finishAfterIso,
      offerSequence: Number(txResult.Sequence),
      createEngineResult: engineResult,
      createLedgerIndex:
        typeof txResult.ledger_index === "number" ? txResult.ledger_index : undefined
    };
  } finally {
    await client.disconnect();
  }
};

const resolveDestinationAddress = (campaignJournalistAddress: string) => {
  if (isValidClassicAddress(campaignJournalistAddress)) {
    return campaignJournalistAddress;
  }

  const fromEnv = readEnv("JOURNALIST_WALLET_ADDRESS");
  if (fromEnv && isValidClassicAddress(fromEnv)) {
    return fromEnv;
  }

  throw {
    status: 400,
    message:
      "Invalid destination wallet address. Set a valid campaign journalistAddress or JOURNALIST_WALLET_ADDRESS."
  } as ApiError;
};

// Accepts a donation intent and returns a donation payload plus identifiers.
// Requires a client-supplied paymentTx/requestId to support idempotency.
router.post("/", async (req, res) => {
  const { campaignId: incomingCampaignId, amountXrp } = req.body ?? {};
  const paymentTx = req.body?.paymentTx ?? req.body?.requestId;

  if (!incomingCampaignId) {
    return badRequest(res, "Invalid campaignId");
  }

  if (!amountXrp || Number(amountXrp) <= 0) {
    return badRequest(res, "Invalid amountXrp");
  }

  if (!paymentTx || typeof paymentTx !== "string") {
    return badRequest(res, "Missing paymentTx or requestId");
  }

  // Idempotency: if this paymentTx was already processed, return 409.
  const existing = STUB_MODE
    ? findDonationByPaymentTxStub(paymentTx)
    : findDonationByPaymentTxDb(paymentTx);

  if (existing) {
    return conflict(res, "Duplicate donation", {
      donationId: existing.donation.id,
      escrowId: existing.donation.escrowId
    });
  }

  const normalizedAmount = Number(amountXrp);
  try {
    if (STUB_MODE) {
      const result = createDonationStub(incomingCampaignId, normalizedAmount, paymentTx);
      if (!result) {
        return badRequest(res, "Invalid campaignId");
      }

      return res.json({
        message: "Donation received (stub mode)",
        donationId: result.donation.id,
        escrowId: result.escrow.id,
        escrowCreateTx: result.escrow.escrowCreateTx,
        donation: result.donation
      });
    }

    const campaign = getCampaignSummaryDb(incomingCampaignId);
    if (!campaign) {
      return badRequest(res, "Invalid campaignId");
    }

    const destinationAddress = resolveDestinationAddress(campaign.journalistAddress);
    const escrowMeta = await submitEscrowCreate(normalizedAmount, destinationAddress);
    const result = createDonationDb(incomingCampaignId, normalizedAmount, paymentTx, escrowMeta);
    if (!result) {
      return badRequest(res, "Invalid campaignId");
    }

    return res.json({
      message: "Donation received",
      donationId: result.donation.id,
      escrowId: result.escrow.id,
      escrowCreateTx: result.escrow.escrowCreateTx,
      donation: result.donation,
      engineResult: result.escrow.createEngineResult ?? "tesSUCCESS"
    });
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 409) {
      return conflict(res, apiError.message, apiError.details);
    }
    if (apiError.status >= 400 && apiError.status < 500) {
      return badRequest(res, apiError.message);
    }
    return res.status(apiError.status).json({
      error: apiError.message,
      details: apiError.details
    });
  }
});

export default router;
