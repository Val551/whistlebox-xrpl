import { Router } from "express";
import { STUB_MODE } from "../config.js";
import {
  approveEscrow as approveEscrowDb,
  getCampaignSummary as getCampaignSummaryDb
} from "../data/dbStore.js";
import {
  approveEscrow as approveEscrowStub,
  getCampaignSummary as getCampaignSummaryStub
} from "../data/stubStore.js";
import { conflict, notFound } from "../httpErrors.js";
import { requireVerifierAuth } from "../verifierAuth.js";

const router = Router();

// Returns a campaign with a minimal escrow summary for public display.
// Returns a campaign with a minimal escrow summary for public display.
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const campaign = STUB_MODE
    ? getCampaignSummaryStub(id)
    : getCampaignSummaryDb(id);
  if (!campaign) {
    return notFound(res, "Campaign not found");
  }

  return res.json(campaign);
});

// Verifier approval endpoint that releases an escrow in stub or DB mode.
router.post("/:id/escrows/:escrowId/approve", requireVerifierAuth, (req, res) => {
  const { id, escrowId } = req.params;
  const result = STUB_MODE
    ? approveEscrowStub(id, escrowId)
    : approveEscrowDb(id, escrowId);
  if (!result) {
    return notFound(res, "Campaign or escrow not found");
  }

  if ("alreadyReleased" in result && result.alreadyReleased) {
    return conflict(res, "Escrow already released");
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
