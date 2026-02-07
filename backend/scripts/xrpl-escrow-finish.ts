import "dotenv/config";
import { Client, Wallet, rippleTimeToUnixTime, type EscrowFinish } from "xrpl";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function requiredEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing ${name} in backend/.env`);
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type EscrowFinishReport = {
  xrplWss: string;
  finisherAddress: string;
  ownerAddress: string;
  offerSequence: number;
  escrowCreateTxHash?: string;
  escrowCreateFinishAfterRipple?: number;
  escrowCreateFinishAfterIso?: string;
  finishTxHash: string;
  finishLedgerIndex: number;
  explorerUrl?: string;
};

async function loadEscrowCreateData(
  client: Client,
  createTxHash: string,
): Promise<{ ownerAddress: string; offerSequence: number; finishAfter?: number }> {
  const txResponse = await client.request({
    command: "tx",
    transaction: createTxHash,
  });

  const tx = txResponse.result;
  if (tx.TransactionType !== "EscrowCreate") {
    throw new Error(`XRPL_ESCROW_CREATE_TX_HASH is not an EscrowCreate transaction: ${createTxHash}`);
  }

  if (typeof tx.Account !== "string") {
    throw new Error(`EscrowCreate transaction is missing Account: ${createTxHash}`);
  }
  if (typeof tx.Sequence !== "number") {
    throw new Error(`EscrowCreate transaction is missing Sequence: ${createTxHash}`);
  }

  return {
    ownerAddress: tx.Account,
    offerSequence: tx.Sequence,
    finishAfter: typeof tx.FinishAfter === "number" ? tx.FinishAfter : undefined,
  };
}

function parseOfferSequence(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid XRPL_ESCROW_OFFER_SEQUENCE value: ${value}`);
  }
  return parsed;
}

async function runEscrowFinish(assertMode: boolean): Promise<EscrowFinishReport> {
  const xrplWss = requiredEnv("XRPL_WSS");
  const verifierSeed = requiredEnv("VERIFIER_WALLET_SEED");
  const explorerBase = readEnv("XRPL_EXPLORER");

  const createTxHash = readEnv("XRPL_ESCROW_CREATE_TX_HASH");
  const ownerFromEnv = readEnv("XRPL_ESCROW_OWNER_ADDRESS");
  const offerSequenceFromEnv = readEnv("XRPL_ESCROW_OFFER_SEQUENCE");

  const wallet = Wallet.fromSeed(verifierSeed);
  const client = new Client(xrplWss);
  await client.connect();

  try {
    let ownerAddress = ownerFromEnv;
    let offerSequence =
      offerSequenceFromEnv !== undefined ? parseOfferSequence(offerSequenceFromEnv) : undefined;
    let finishAfterRipple: number | undefined;

    if (createTxHash) {
      const createData = await loadEscrowCreateData(client, createTxHash);
      ownerAddress = ownerAddress ?? createData.ownerAddress;
      offerSequence = offerSequence ?? createData.offerSequence;
      finishAfterRipple = createData.finishAfter;
    }

    if (!ownerAddress) {
      throw new Error(
        "Missing escrow owner. Set XRPL_ESCROW_OWNER_ADDRESS or XRPL_ESCROW_CREATE_TX_HASH.",
      );
    }
    if (offerSequence === undefined) {
      throw new Error(
        "Missing escrow OfferSequence. Set XRPL_ESCROW_OFFER_SEQUENCE or XRPL_ESCROW_CREATE_TX_HASH.",
      );
    }

    let finishAfterIso: string | undefined;
    if (finishAfterRipple !== undefined) {
      const finishAfterUnixMs = rippleTimeToUnixTime(finishAfterRipple);
      finishAfterIso = new Date(finishAfterUnixMs).toISOString();
      const waitMs = finishAfterUnixMs - Date.now() + 2000;
      if (waitMs > 0) {
        await sleep(waitMs);
      }
    }

    const tx: EscrowFinish = {
      TransactionType: "EscrowFinish",
      Account: wallet.classicAddress,
      Owner: ownerAddress,
      OfferSequence: offerSequence,
    };

    const submitResult = await client.submitAndWait(tx, { wallet });
    const txResult = submitResult.result;
    const engineResult = txResult.meta?.TransactionResult;
    if (engineResult !== "tesSUCCESS") {
      throw new Error(`EscrowFinish failed with result ${engineResult ?? "unknown"}`);
    }

    const finishTxHash = txResult.hash;
    if (typeof finishTxHash !== "string" || finishTxHash.length === 0) {
      throw new Error("EscrowFinish response missing tx hash.");
    }

    const finishLedgerIndex = txResult.ledger_index;
    if (typeof finishLedgerIndex !== "number") {
      throw new Error("EscrowFinish response missing validated ledger index.");
    }

    const report: EscrowFinishReport = {
      xrplWss,
      finisherAddress: wallet.classicAddress,
      ownerAddress,
      offerSequence,
      escrowCreateTxHash: createTxHash,
      escrowCreateFinishAfterRipple: finishAfterRipple,
      escrowCreateFinishAfterIso: finishAfterIso,
      finishTxHash,
      finishLedgerIndex,
      explorerUrl: explorerBase ? `${explorerBase}${finishTxHash}` : undefined,
    };

    if (assertMode) {
      if (report.finishTxHash.length < 20) {
        throw new Error(`Unexpected EscrowFinish hash output: ${report.finishTxHash}`);
      }
      if (report.offerSequence < 1) {
        throw new Error(`Unexpected OfferSequence: ${report.offerSequence}`);
      }
    }

    return report;
  } finally {
    await client.disconnect();
  }
}

async function main(): Promise<void> {
  const assertMode = process.argv.includes("--assert");
  const report = await runEscrowFinish(assertMode);

  console.log(assertMode ? "Step 4 test passed: EscrowFinish submitted" : "Step 4 complete: EscrowFinish submitted");
  console.log(`XRPL_WSS:              ${report.xrplWss}`);
  console.log(`Finisher (verifier):   ${report.finisherAddress}`);
  console.log(`Escrow owner:          ${report.ownerAddress}`);
  console.log(`OfferSequence:         ${report.offerSequence}`);
  if (report.escrowCreateTxHash) {
    console.log(`EscrowCreate tx hash:  ${report.escrowCreateTxHash}`);
  }
  if (report.escrowCreateFinishAfterIso) {
    console.log(`FinishAfter (ISO):     ${report.escrowCreateFinishAfterIso}`);
  }
  if (report.escrowCreateFinishAfterRipple !== undefined) {
    console.log(`FinishAfter (Ripple):  ${report.escrowCreateFinishAfterRipple}`);
  }
  console.log(`Finish tx hash:        ${report.finishTxHash}`);
  console.log(`Validated ledger:      ${report.finishLedgerIndex}`);
  if (report.explorerUrl) {
    console.log(`Explorer:              ${report.explorerUrl}`);
  }
}

main().catch((error) => {
  console.error("Step 4 failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
