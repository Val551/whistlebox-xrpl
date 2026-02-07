import { Router } from "express";
import { STUB_MODE } from "../config.js";
import {
  createDonation as createDonationDb,
  findDonationByPaymentTx as findDonationByPaymentTxDb
} from "../data/dbStore.js";
import {
  createDonation as createDonationStub,
  findDonationByPaymentTx as findDonationByPaymentTxStub
} from "../data/stubStore.js";
import { badRequest, conflict } from "../httpErrors.js";

const router = Router();

// Accepts a donation intent and returns a donation payload plus identifiers.
// Requires a client-supplied paymentTx/requestId to support idempotency.
router.post("/", (req, res) => {
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
  const result = STUB_MODE
    ? createDonationStub(incomingCampaignId, normalizedAmount, paymentTx)
    : createDonationDb(incomingCampaignId, normalizedAmount, paymentTx);
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
});

export default router;
