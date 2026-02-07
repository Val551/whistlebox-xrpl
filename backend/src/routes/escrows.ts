import { Router } from "express";
import { STUB_MODE } from "../config.js";
import { listEscrows as listEscrowsDb, releaseEscrow as releaseEscrowDb } from "../data/dbStore.js";
import { listEscrows as listEscrowsStub, releaseEscrow as releaseEscrowStub } from "../data/stubStore.js";
import { conflict, notFound } from "../httpErrors.js";

const router = Router();

// Returns full escrow records for verifier and audit views.
router.get("/", (_req, res) => {
  const escrows = STUB_MODE ? listEscrowsStub() : listEscrowsDb();
  return res.json({ escrows });
});

// Releases an escrow in stub mode and returns the updated escrow payload.
router.post("/:id/release", (req, res) => {
  const { id } = req.params;
  const result = STUB_MODE ? releaseEscrowStub(id) : releaseEscrowDb(id);
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
});

export default router;
