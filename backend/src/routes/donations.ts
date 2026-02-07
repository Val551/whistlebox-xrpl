import { Router } from "express";
import { campaignId } from "../data/stub.js";

const router = Router();

router.post("/", (req, res) => {
  const { campaignId: incomingCampaignId, amountXrp } = req.body ?? {};

  if (!incomingCampaignId || incomingCampaignId !== campaignId) {
    return res.status(400).json({ error: "Invalid campaignId" });
  }

  if (!amountXrp || Number(amountXrp) <= 0) {
    return res.status(400).json({ error: "Invalid amountXrp" });
  }

  return res.json({
    message: "Donation received (stub mode)",
    donationId: `donation-${Date.now()}`,
    escrowId: `escrow-${Date.now()}`,
    escrowCreateTx: "STUB-CREATE-TX"
  });
});

export default router;
