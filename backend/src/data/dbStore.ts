// SQLite-backed store used when STUB_MODE=false.
// Implements the same read/write surface as the stub store while persisting data.
// This keeps the app transparent (escrow totals and tx refs) without storing donor identities.
import { getDb } from "../db.js";

type CampaignRow = {
  id: string;
  title: string;
  description: string;
  journalistAddress: string;
  verifierAddress: string;
  totalRaisedXrp: number;
  totalLockedXrp: number;
  totalReleasedXrp: number;
  escrowCount: number;
  status: string;
};

type EscrowRow = {
  id: string;
  campaignId: string;
  donationId: string;
  amountXrp: number;
  currency: "XRP";
  escrowCreateTx: string;
  escrowFinishTx: string | null;
  ownerAddress: string;
  destinationAddress: string;
  condition: string | null;
  fulfillment: string | null;
  finishAfter: string;
  status: "locked" | "released" | "failed";
};

type DonationRow = {
  id: string;
  campaignId: string;
  amountXrp: number;
  donorTag: string | null;
  paymentTx: string;
  createdAt: string;
  escrowId: string;
  status: "received" | "escrowed" | "failed";
};

// Helper to generate stable, padded IDs like donation-0003 or escrow-0012.
// IDs remain human-readable for demo clarity.
const formatId = (prefix: string, counter: number) =>
  `${prefix}-${String(counter).padStart(4, "0")}`;

// Retrieves the next sequence number for a table by counting existing rows.
// This is a simple hackathon-safe approach (not for concurrent production writes).
const nextSequence = (table: "donations" | "escrows") => {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as {
    count: number;
  };
  return row.count + 1;
};

// Returns a campaign with minimal escrow summary entries for public display.
// Keeps public UI focused on totals and escrow states (glass-box transparency).
export const getCampaignSummary = (id: string) => {
  const db = getDb();
  const campaign = db
    .prepare("SELECT * FROM campaigns WHERE id = ?")
    .get(id) as CampaignRow | undefined;

  if (!campaign) {
    return null;
  }

  const escrows = db
    .prepare(
      "SELECT id, amountXrp, status FROM escrows WHERE campaignId = ? ORDER BY id"
    )
    .all(id) as Array<{ id: string; amountXrp: number; status: string }>;

  return {
    ...campaign,
    escrows
  };
};

// Returns full escrow records for verifier and audit views.
// These records include tx hashes so the demo can link to explorers.
export const listEscrows = () => {
  const db = getDb();
  return db
    .prepare("SELECT * FROM escrows ORDER BY id")
    .all() as EscrowRow[];
};

// Finds an existing donation by its client-supplied paymentTx for idempotency checks.
export const findDonationByPaymentTx = (paymentTx: string) => {
  const db = getDb();
  const donation = db
    .prepare("SELECT * FROM donations WHERE paymentTx = ?")
    .get(paymentTx) as DonationRow | undefined;

  if (!donation) {
    return null;
  }

  const escrow = db
    .prepare("SELECT * FROM escrows WHERE id = ?")
    .get(donation.escrowId) as EscrowRow | undefined;

  return { donation, escrow };
};

// Creates donation + escrow records in the database, updating campaign totals.
// Does not store donor identity; only amount, timestamps, and tx references.
export const createDonation = (
  campaignId: string,
  amountXrp: number,
  paymentTx: string
) => {
  const db = getDb();
  const campaign = db
    .prepare("SELECT * FROM campaigns WHERE id = ?")
    .get(campaignId) as CampaignRow | undefined;

  if (!campaign) {
    return null;
  }

  const donationId = formatId("donation", nextSequence("donations"));
  const escrowId = formatId("escrow", nextSequence("escrows"));
  const createdAt = new Date().toISOString();
  const finishAfter = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // Placeholder tx hashes until XRPL integration is wired.
  const uniquePaymentTx = paymentTx;
  const escrowCreateTx = `DB-CREATE-TX-${escrowId}`;
  // Custody address should come from environment once wallet provisioning is complete.
  const ownerAddress = "rCUSTODYADDRESS...";

  const insertDonation = db.prepare(
    "INSERT INTO donations (id, campaignId, amountXrp, donorTag, paymentTx, createdAt, escrowId, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertEscrow = db.prepare(
    "INSERT INTO escrows (id, campaignId, donationId, amountXrp, currency, escrowCreateTx, escrowFinishTx, ownerAddress, destinationAddress, condition, fulfillment, finishAfter, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const updateDonation = db.prepare(
    "UPDATE donations SET escrowId = ? WHERE id = ?"
  );
  const updateCampaign = db.prepare(
    "UPDATE campaigns SET totalRaisedXrp = totalRaisedXrp + ?, totalLockedXrp = totalLockedXrp + ?, escrowCount = escrowCount + 1 WHERE id = ?"
  );

  const transaction = db.transaction(() => {
    insertDonation.run(
      donationId,
      campaignId,
      amountXrp,
      null,
      uniquePaymentTx,
      createdAt,
      null,
      "escrowed"
    );

    insertEscrow.run(
      escrowId,
      campaignId,
      donationId,
      amountXrp,
      "XRP",
      escrowCreateTx,
      null,
      ownerAddress,
      campaign.journalistAddress,
      null,
      null,
      finishAfter,
      "locked"
    );

    updateDonation.run(escrowId, donationId);
    updateCampaign.run(amountXrp, amountXrp, campaignId);
  });

  transaction();

  const donation = db
    .prepare("SELECT * FROM donations WHERE id = ?")
    .get(donationId) as DonationRow;
  const escrow = db
    .prepare("SELECT * FROM escrows WHERE id = ?")
    .get(escrowId) as EscrowRow;

  return { donation, escrow };
};

// Marks an escrow as released and updates campaign totals.
// Mirrors the verifier approval flow in the project idea.
export const releaseEscrow = (escrowId: string) => {
  const db = getDb();
  const escrow = db
    .prepare("SELECT * FROM escrows WHERE id = ?")
    .get(escrowId) as EscrowRow | undefined;

  if (!escrow) {
    return null;
  }

  if (escrow.status === "released") {
    return { escrow, alreadyReleased: true };
  }

  const finishTx = `DB-FINISH-TX-${escrowId}`;
  const updateEscrow = db.prepare(
    "UPDATE escrows SET escrowFinishTx = ?, status = ? WHERE id = ?"
  );
  const updateCampaign = db.prepare(
    "UPDATE campaigns SET totalLockedXrp = totalLockedXrp - ?, totalReleasedXrp = totalReleasedXrp + ? WHERE id = ?"
  );

  const transaction = db.transaction(() => {
    updateEscrow.run(finishTx, "released", escrowId);
    updateCampaign.run(escrow.amountXrp, escrow.amountXrp, escrow.campaignId);
  });

  transaction();

  const updated = db
    .prepare("SELECT * FROM escrows WHERE id = ?")
    .get(escrowId) as EscrowRow;

  return { escrow: updated, finishTx };
};

// Approves and releases an escrow scoped to a campaign.
// Used by the verifier dashboard to trigger escrow finish.
export const approveEscrow = (campaignId: string, escrowId: string) => {
  const db = getDb();
  const escrow = db
    .prepare("SELECT * FROM escrows WHERE id = ? AND campaignId = ?")
    .get(escrowId, campaignId) as EscrowRow | undefined;

  if (!escrow) {
    return null;
  }

  if (escrow.status === "released") {
    return { escrow, alreadyReleased: true };
  }

  return releaseEscrow(escrowId);
};
