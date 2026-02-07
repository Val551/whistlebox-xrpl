// SQLite initialization and access layer.
// Keeps persistence local and minimal, aligned with the project's glass-box goal:
// store only what is needed to show escrow transparency without donor identity.
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import {
  campaign as seedCampaign,
  donations as seedDonations,
  escrows as seedEscrows
} from "./data/stub.js";

let dbInstance: Database.Database | null = null;

// Resolves the database file location, defaulting to backend/data/whistlebox.sqlite.
// This keeps local dev simple while supporting overrides via DB_PATH.
const resolveDbPath = () =>
  process.env.DB_PATH ?? path.resolve(process.cwd(), "data", "whistlebox.sqlite");

// Loads and executes the schema file to ensure tables exist before any queries run.
const loadSchema = (db: Database.Database) => {
  const schemaPath = path.resolve(process.cwd(), "sql", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);
};

// Adds columns required by newer story increments when running against an existing DB file.
const ensureColumn = (
  db: Database.Database,
  table: string,
  column: string,
  definition: string
) => {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  const hasColumn = rows.some((row) => row.name === column);
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

// Seeds the database with the default campaign + sample records if empty.
// This keeps the app usable without XRPL integration while honoring the project idea.
const seedDb = (db: Database.Database) => {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM campaigns")
    .get() as { count: number };

  if (row.count > 0) {
    return;
  }

  const insertCampaign = db.prepare(
    "INSERT INTO campaigns (id, title, description, journalistAddress, verifierAddress, totalRaisedXrp, totalLockedXrp, totalReleasedXrp, escrowCount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertDonation = db.prepare(
    "INSERT INTO donations (id, campaignId, amountXrp, donorTag, paymentTx, createdAt, escrowId, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertEscrow = db.prepare(
    "INSERT INTO escrows (id, campaignId, donationId, amountXrp, currency, escrowCreateTx, escrowFinishTx, ownerAddress, destinationAddress, condition, fulfillment, finishAfter, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const updateDonation = db.prepare(
    "UPDATE donations SET escrowId = ? WHERE id = ?"
  );

  const transaction = db.transaction(() => {
    insertCampaign.run(
      seedCampaign.id,
      seedCampaign.title,
      seedCampaign.description,
      seedCampaign.journalistAddress,
      seedCampaign.verifierAddress,
      seedCampaign.totalRaisedXrp,
      seedCampaign.totalLockedXrp,
      seedCampaign.totalReleasedXrp,
      seedCampaign.escrowCount,
      seedCampaign.status
    );

    for (const donation of seedDonations) {
      insertDonation.run(
        donation.id,
        donation.campaignId,
        donation.amountXrp,
        donation.donorTag,
        donation.paymentTx,
        donation.createdAt,
        null,
        donation.status
      );
    }

    for (const escrow of seedEscrows) {
      insertEscrow.run(
        escrow.id,
        escrow.campaignId,
        escrow.donationId,
        escrow.amountXrp,
        escrow.currency,
        escrow.escrowCreateTx,
        escrow.escrowFinishTx,
        escrow.ownerAddress,
        escrow.destinationAddress,
        escrow.condition,
        escrow.fulfillment,
        escrow.finishAfter,
        escrow.status
      );
    }

    for (const donation of seedDonations) {
      updateDonation.run(donation.escrowId, donation.id);
    }
  });

  transaction();
};

// Returns a singleton SQLite connection, creating folders and schema on first call.
// This is invoked at startup when STUB_MODE is disabled.
export const getDb = () => {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  loadSchema(db);
  ensureColumn(db, "escrows", "offerSequence", "INTEGER");
  ensureColumn(db, "escrows", "createEngineResult", "TEXT");
  ensureColumn(db, "escrows", "createLedgerIndex", "INTEGER");
  seedDb(db);

  dbInstance = db;
  return dbInstance;
};
