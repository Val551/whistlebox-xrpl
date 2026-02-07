import { Router } from "express";
import { STUB_MODE } from "../config.js";
import { createDonation as createDonationDb } from "../data/dbStore.js";
import { createDonation as createDonationStub } from "../data/stubStore.js";

const router = Router();

// Accepts a donation intent and returns a donation payload plus identifiers.
router.post("/", (req, res) => {
  const { campaignId: incomingCampaignId, amountXrp } = req.body ?? {};

  if (!incomingCampaignId) {
    return res.status(400).json({ error: "Invalid campaignId" });
  }

  if (!amountXrp || Number(amountXrp) <= 0) {
    return res.status(400).json({ error: "Invalid amountXrp" });
  }

  const normalizedAmount = Number(amountXrp);
  const result = STUB_MODE
    ? createDonationStub(incomingCampaignId, normalizedAmount)
    : createDonationDb(incomingCampaignId, normalizedAmount);
  if (!result) {
    return res.status(400).json({ error: "Invalid campaignId" });
  }

  return res.json({
    message: "Donation received (stub mode)",
    donationId: result.donation.id,
    escrowId: result.escrow.id,
    escrowCreateTx: result.escrow.escrowCreateTx,
    donation: result.donation
  });
});

export default router;
