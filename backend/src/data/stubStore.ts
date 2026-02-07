// In-memory deterministic stub store used when STUB_MODE=true.
// Provides predictable IDs, timestamps, and state transitions for demos/tests.
import { campaign as baseCampaign, campaignId, escrows, donations } from "./stub.js";

// Local type aliases derived from the shared stub data.
type Campaign = typeof baseCampaign;
type Escrow = (typeof escrows)[number];
type Donation = (typeof donations)[number];

// Fixed baseline timestamp so generated values are deterministic.
const baseTimestamp = Date.parse("2026-02-07T00:00:00.000Z");

// Mutable in-memory state, seeded from the static stub data.
const state: {
  campaign: Campaign;
  escrows: Escrow[];
  donations: Donation[];
  escrowCounter: number;
  donationCounter: number;
} = {
  campaign: { ...baseCampaign },
  escrows: escrows.map((escrow) => ({ ...escrow })),
  donations: donations.map((donation) => ({ ...donation })),
  escrowCounter: escrows.length,
  donationCounter: donations.length
};

// Helper to generate stable, padded IDs like donation-0003 or escrow-0012.
const formatId = (prefix: string, counter: number) =>
  `${prefix}-${String(counter).padStart(4, "0")}`;

// Helper to generate a deterministic ISO timestamp offset from the base.
const nextTimestamp = (offset: number) =>
  new Date(baseTimestamp + offset * 60_000).toISOString();

// Returns a campaign with minimal escrow summary entries for public display.
export const getCampaignSummary = (id: string) => {
  if (id !== campaignId) {
    return null;
  }

  return {
    ...state.campaign,
    escrows: state.escrows.map((escrow) => ({
      id: escrow.id,
      amountXrp: escrow.amountXrp,
      status: escrow.status
    }))
  };
};

// Returns full escrow records for verifier and audit views.
export const listEscrows = () => state.escrows.map((escrow) => ({ ...escrow }));

// Finds an existing donation by its client-supplied paymentTx for idempotency checks.
export const findDonationByPaymentTx = (paymentTx: string) => {
  const donation = state.donations.find((item) => item.paymentTx === paymentTx);
  if (!donation) {
    return null;
  }

  const escrow = state.escrows.find((item) => item.id === donation.escrowId);
  return { donation, escrow };
};

// Creates deterministic donation + escrow records in stub mode.
// Uses the client-supplied paymentTx to mirror the real XRPL payment → escrow flow.
export const createDonation = (
  incomingCampaignId: string,
  amountXrp: number,
  paymentTx: string
) => {
  if (incomingCampaignId !== campaignId) {
    return null;
  }

  state.donationCounter += 1;
  state.escrowCounter += 1;

  const donationId = formatId("donation", state.donationCounter);
  const escrowId = formatId("escrow", state.escrowCounter);
  const createdAt = nextTimestamp(state.donationCounter);
  const finishAfter = nextTimestamp(state.escrowCounter + 10);

  const donation: Donation = {
    id: donationId,
    campaignId,
    amountXrp,
    donorTag: null,
    paymentTx,
    createdAt,
    escrowId,
    status: "escrowed"
  };

  const escrow: Escrow = {
    id: escrowId,
    campaignId,
    donationId,
    amountXrp,
    currency: "XRP",
    escrowCreateTx: `STUB-CREATE-TX-${state.escrowCounter}`,
    escrowFinishTx: null,
    ownerAddress: "rCUSTODYADDRESS...",
    destinationAddress: state.campaign.journalistAddress,
    condition: null,
    fulfillment: null,
    finishAfter,
    status: "locked"
  };

  state.donations.push(donation);
  state.escrows.push(escrow);

  state.campaign.totalRaisedXrp += amountXrp;
  state.campaign.totalLockedXrp += amountXrp;
  state.campaign.escrowCount += 1;

  return {
    donation,
    escrow
  };
};

// Marks an escrow as released and returns the updated record.
export const releaseEscrow = (escrowId: string) => {
  const escrowIndex = state.escrows.findIndex((item) => item.id === escrowId);
  if (escrowIndex === -1) {
    return null;
  }

  const escrow = state.escrows[escrowIndex];
  if (escrow.status === "released") {
    return { escrow, alreadyReleased: true, finishTx: escrow.escrowFinishTx ?? undefined };
  }

  const finishTx = `STUB-FINISH-TX-${escrowId}`;
  const updated: Escrow = {
    ...escrow,
    escrowFinishTx: finishTx,
    status: "released"
  };

  state.escrows[escrowIndex] = updated;
  state.campaign.totalLockedXrp -= escrow.amountXrp;
  state.campaign.totalReleasedXrp += escrow.amountXrp;

  return { escrow: updated, finishTx };
};

// Approves and releases an escrow scoped to a campaign.
export const approveEscrow = (incomingCampaignId: string, escrowId: string) => {
  if (incomingCampaignId !== campaignId) {
    return null;
  }

  const escrow = state.escrows.find((item) => item.id === escrowId);
  if (!escrow) {
    return null;
  }

  if (escrow.status === "released") {
    return { escrow, alreadyReleased: true, finishTx: escrow.escrowFinishTx ?? undefined };
  }

  return releaseEscrow(escrowId);
};
