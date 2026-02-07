import { Router } from "express";
import { STUB_MODE } from "../config.js";
import { approveEscrow, getCampaignSummary } from "../data/stubStore.js";

const router = Router();

// Returns a campaign with a minimal escrow summary for public display.
// Returns a campaign with a minimal escrow summary for public display.
router.get("/:id", (req, res) => {
  if (!STUB_MODE) {
    return res.status(501).json({ error: "DB mode not implemented yet" });
  }

  const { id } = req.params;
  const campaign = getCampaignSummary(id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  return res.json(campaign);
});

// Verifier approval endpoint that releases an escrow in stub mode.
router.post("/:id/escrows/:escrowId/approve", (req, res) => {
  if (!STUB_MODE) {
    return res.status(501).json({ error: "DB mode not implemented yet" });
  }

  const { id, escrowId } = req.params;
  const result = approveEscrow(id, escrowId);
  if (!result) {
    return res.status(404).json({ error: "Campaign or escrow not found" });
  }

  if ("alreadyReleased" in result && result.alreadyReleased) {
    return res.status(400).json({ error: "Escrow already released" });
  }

  return res.json({
    message: "Escrow approved and released (stub mode)",
    campaignId: id,
    escrowId,
    finishTx: result.finishTx,
    escrow: result.escrow
  });
});

export default router;
