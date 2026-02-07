import { Router } from "express";
import { STUB_MODE } from "../config.js";
import { approveEscrow as approveEscrowDb, getCampaignSummary as getCampaignSummaryDb } from "../data/dbStore.js";
import { approveEscrow as approveEscrowStub, getCampaignSummary as getCampaignSummaryStub } from "../data/stubStore.js";

const router = Router();

// Returns a campaign with a minimal escrow summary for public display.
// Returns a campaign with a minimal escrow summary for public display.
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const campaign = STUB_MODE
    ? getCampaignSummaryStub(id)
    : getCampaignSummaryDb(id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  return res.json(campaign);
});

// Verifier approval endpoint that releases an escrow in stub or DB mode.
router.post("/:id/escrows/:escrowId/approve", (req, res) => {
  const { id, escrowId } = req.params;
  const result = STUB_MODE
    ? approveEscrowStub(id, escrowId)
    : approveEscrowDb(id, escrowId);
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
