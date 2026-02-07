import { Router } from "express";
import { STUB_MODE } from "../config.js";
import { listEscrows, releaseEscrow } from "../data/stubStore.js";

const router = Router();

// Returns full escrow records for verifier and audit views.
router.get("/", (_req, res) => {
  if (!STUB_MODE) {
    return res.status(501).json({ error: "DB mode not implemented yet" });
  }

  return res.json({ escrows: listEscrows() });
});

// Releases an escrow in stub mode and returns the updated escrow payload.
router.post("/:id/release", (req, res) => {
  if (!STUB_MODE) {
    return res.status(501).json({ error: "DB mode not implemented yet" });
  }

  const { id } = req.params;
  const result = releaseEscrow(id);
  if (!result) {
    return res.status(404).json({ error: "Escrow not found" });
  }

  if ("alreadyReleased" in result && result.alreadyReleased) {
    return res.status(400).json({ error: "Escrow already released" });
  }

  return res.json({
    message: "Escrow release simulated (stub mode)",
    escrowId: id,
    finishTx: result.finishTx,
    escrow: result.escrow
  });
});

export default router;
