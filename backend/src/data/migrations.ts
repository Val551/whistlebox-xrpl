import "dotenv/config";
import { createCampaign, createDonation } from "./dbStore.js";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

async function runMigration(): Promise<void> {
  console.log("Migrating test data to SQLite from .env variables...");
  console.log("");

  const custodyWalletAddress = readEnv("CUSTODY_WALLET_ADDRESS");
  const journalistWalletAddress = readEnv("JOURNALIST_WALLET_ADDRESS");
  const verifierWalletAddress = readEnv("VERIFIER_WALLET_ADDRESS");
  const escrowCreateTxHash = readEnv("XRPL_ESCROW_CREATE_TX_HASH");
  const escrowOwnerAddress = readEnv("XRPL_ESCROW_OWNER_ADDRESS");
  const escrowOfferSequence = readEnv("XRPL_ESCROW_OFFER_SEQUENCE");

  if (!journalistWalletAddress) {
    throw new Error("Missing JOURNALIST_WALLET_ADDRESS in .env");
  }

  if (!verifierWalletAddress) {
    throw new Error("Missing VERIFIER_WALLET_ADDRESS in .env");
  }

  // Create 3 sample campaigns
//   const campaigns = [
//     {
//       id: "cityhall-001",
//       title: "City Hall Contracts Investigation",
//       description: "Funding an investigative series into city hall procurement practices.",
//       journalistAddress: journalistWalletAddress,
//       verifierAddress: verifierWalletAddress,
//       goalXrp: 100,
//     },
//     {
//       id: "school-board-001",
//       title: "School Board Corruption Investigation",
//       description: "Exposing financial irregularities and bid-rigging in school board contracts.",
//       journalistAddress: journalistWalletAddress,
//       verifierAddress: verifierWalletAddress,
//       goalXrp: 150,
//     },
//     {
//       id: "environmental-001",
//       title: "Environmental Violations Investigation",
//       description: "Investigating illegal dumping and environmental code violations by local industries.",
//       journalistAddress: journalistWalletAddress,
//       verifierAddress: verifierWalletAddress,
//       goalXrp: 120,
//     },
//   ];

//   for (const campaign of campaigns) {
//     const created = createCampaign(campaign);
//     if (created) {
//       console.log(`✓ Created campaign: ${campaign.id}`);
//     } else {
//       console.log(`→ Campaign already exists: ${campaign.id}`);
//     }
//   }

//   console.log("");
//   console.log("Creating test escrows...");

//   // Helper to create test escrows with different amounts
//   const createTestEscrow = (
//     campaignId: string,
//     amountXrp: number,
//     index: number,
//     txHash?: string
//   ) => {
//     const paymentTx = txHash || `payment-${campaignId}-${index}-${Date.now()}`;
//     const finishAfter = new Date(Date.now() - 1000).toISOString(); // 1 second in the past for immediate release

//     const result = createDonation(
//       campaignId,
//       amountXrp,
//       paymentTx,
//       txHash
//         ? {
//             escrowCreateTx: txHash,
//             ownerAddress: escrowOwnerAddress || custodyWalletAddress || "rCUSTODYADDRESS...",
//             destinationAddress: journalistWalletAddress,
//             finishAfter,
//             offerSequence: escrowOfferSequence ? Number(escrowOfferSequence) : undefined,
//             createEngineResult: "tesSUCCESS",
//           }
//         : undefined
//     );

//     if (result) {
//       console.log(`  ✓ Created escrow: ${result.escrow.id} (${amountXrp} XRP)`);
//     }
//   };

//   // Add test escrows to each campaign
//   // Campaign 1: cityhall-001 (with real escrow create TX if available)
//   createTestEscrow("cityhall-001", 1, 1, escrowCreateTxHash);
//   createTestEscrow("cityhall-001", 1, 2);
//   createTestEscrow("cityhall-001", 1, 3);

//   // Campaign 2: school-board-001
//   createTestEscrow("school-board-001", 1, 1);
//   createTestEscrow("school-board-001", 1, 2);
//   createTestEscrow("school-board-001", 1, 3);

//   // Campaign 3: environmental-001
//   createTestEscrow("environmental-001", 1, 1);
//   createTestEscrow("environmental-001", 1, 2);
//   createTestEscrow("environmental-001", 1, 3);

  console.log("");
  console.log("✓ Migration complete!");
  console.log("");
  console.log("Next steps:");
  console.log("1. Set STUB_MODE=false in backend/.env");
  console.log("2. Run: npm run dev");
  console.log("3. Navigate to http://localhost:5173 to select a campaign");
}

runMigration().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
