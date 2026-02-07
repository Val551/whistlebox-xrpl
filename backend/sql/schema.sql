-- SQLite schema for Whistlebox XRPL.
-- Matches shared/contract.json and supports stub + real XRPL flows.

-- Campaigns represent a single investigative funding effort.
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  journalistAddress TEXT NOT NULL,
  verifierAddress TEXT NOT NULL,
  totalRaisedXrp REAL NOT NULL DEFAULT 0,
  totalLockedXrp REAL NOT NULL DEFAULT 0,
  totalReleasedXrp REAL NOT NULL DEFAULT 0,
  escrowCount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'closed'))
);

-- Donations are incoming contributions that result in escrows.
CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL,
  amountXrp REAL NOT NULL,
  donorTag TEXT,
  paymentTx TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  escrowId TEXT,
  status TEXT NOT NULL CHECK (status IN ('received', 'escrowed', 'failed')),
  FOREIGN KEY (campaignId) REFERENCES campaigns(id),
  FOREIGN KEY (escrowId) REFERENCES escrows(id)
);

-- Escrows represent locked funds waiting for verifier approval.
CREATE TABLE IF NOT EXISTS escrows (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL,
  donationId TEXT NOT NULL,
  amountXrp REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XRP' CHECK (currency IN ('XRP')),
  escrowCreateTx TEXT NOT NULL,
  escrowFinishTx TEXT,
  ownerAddress TEXT NOT NULL,
  destinationAddress TEXT NOT NULL,
  condition TEXT,
  fulfillment TEXT,
  finishAfter TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('locked', 'released', 'failed')),
  FOREIGN KEY (campaignId) REFERENCES campaigns(id),
  FOREIGN KEY (donationId) REFERENCES donations(id)
);

-- Prevent duplicate XRPL payment events from creating extra donations.
CREATE UNIQUE INDEX IF NOT EXISTS donations_paymentTx_unique
  ON donations(paymentTx);

-- Ensure escrow TX hashes are unique when present.
CREATE UNIQUE INDEX IF NOT EXISTS escrows_createTx_unique
  ON escrows(escrowCreateTx);
