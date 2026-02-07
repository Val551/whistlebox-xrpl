import "dotenv/config";
import { Client, Wallet, isoTimeToRippleTime, xrpToDrops, type EscrowCreate } from "xrpl";

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

type EscrowCreateReport = {
  xrplWss: string;
  sourceAddress: string;
  destinationAddress: string;
  amountDrops: string;
  amountXrp: string;
  finishAfterRipple: number;
  finishAfterIso: string;
  txHash: string;
  offerSequence: number;
  ledgerIndex: number;
  explorerUrl?: string;
};

function toDropsFromXrp(xrpAmount: string): string {
  try {
    return xrpToDrops(xrpAmount);
  } catch {
    throw new Error(`Invalid XRPL_ESCROW_AMOUNT_XRP value: ${xrpAmount}`);
  }
}

async function runEscrowCreate(assertMode: boolean): Promise<EscrowCreateReport> {
  const xrplWss = requiredEnv("XRPL_WSS");
  const custodySeed = requiredEnv("CUSTODY_WALLET_SEED");
  const journalistAddress = requiredEnv("JOURNALIST_WALLET_ADDRESS");
  const explorerBase = readEnv("XRPL_EXPLORER");

  const amountXrp = readEnv("XRPL_ESCROW_AMOUNT_XRP") ?? "5";
  const finishAfterMinutesRaw = readEnv("XRPL_ESCROW_FINISH_AFTER_MINUTES") ?? "3";
  const finishAfterMinutes = Number(finishAfterMinutesRaw);
  if (!Number.isFinite(finishAfterMinutes) || finishAfterMinutes < 1) {
    throw new Error(
      `Invalid XRPL_ESCROW_FINISH_AFTER_MINUTES value: ${finishAfterMinutesRaw}`,
    );
  }

  const amountDrops = toDropsFromXrp(amountXrp);
  const finishAfterDate = new Date(Date.now() + finishAfterMinutes * 60 * 1000);
  const finishAfterIso = finishAfterDate.toISOString();
  const finishAfterRipple = isoTimeToRippleTime(finishAfterIso);

  const wallet = Wallet.fromSeed(custodySeed);
  const client = new Client(xrplWss);
  await client.connect();

  try {
    const tx: EscrowCreate = {
      TransactionType: "EscrowCreate",
      Account: wallet.classicAddress,
      Destination: journalistAddress,
      Amount: amountDrops,
      FinishAfter: finishAfterRipple,
    };

    const submitResult = await client.submitAndWait(tx, { wallet });
    const txResult = submitResult.result;
    const engineResult = txResult.meta?.TransactionResult;
    if (engineResult !== "tesSUCCESS") {
      throw new Error(`EscrowCreate failed with result ${engineResult ?? "unknown"}`);
    }

    const offerSequence = txResult.Sequence;
    if (typeof offerSequence !== "number") {
      throw new Error("EscrowCreate response missing tx sequence for OfferSequence.");
    }

    const txHash = txResult.hash;
    if (typeof txHash !== "string" || txHash.length === 0) {
      throw new Error("EscrowCreate response missing tx hash.");
    }

    const ledgerIndex = txResult.ledger_index;
    if (typeof ledgerIndex !== "number") {
      throw new Error("EscrowCreate response missing validated ledger index.");
    }

    const report: EscrowCreateReport = {
      xrplWss,
      sourceAddress: wallet.classicAddress,
      destinationAddress: journalistAddress,
      amountDrops,
      amountXrp,
      finishAfterRipple,
      finishAfterIso,
      txHash,
      offerSequence,
      ledgerIndex,
      explorerUrl: explorerBase ? `${explorerBase}${txHash}` : undefined,
    };

    if (assertMode) {
      if (!report.txHash || report.txHash.length < 20) {
        throw new Error(`Unexpected tx hash output: ${report.txHash}`);
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
  const report = await runEscrowCreate(assertMode);

  console.log(assertMode ? "Step 3 test passed: EscrowCreate submitted" : "Step 3 complete: EscrowCreate submitted");
  console.log(`XRPL_WSS:            ${report.xrplWss}`);
  console.log(`Source (custody):    ${report.sourceAddress}`);
  console.log(`Destination:         ${report.destinationAddress}`);
  console.log(`Amount:              ${report.amountXrp} XRP (${report.amountDrops} drops)`);
  console.log(`FinishAfter (ISO):   ${report.finishAfterIso}`);
  console.log(`FinishAfter (Ripple):${report.finishAfterRipple}`);
  console.log(`OfferSequence:       ${report.offerSequence}`);
  console.log(`Validated ledger:    ${report.ledgerIndex}`);
  console.log(`Tx hash:             ${report.txHash}`);
  if (report.explorerUrl) {
    console.log(`Explorer:            ${report.explorerUrl}`);
  }
}

main().catch((error) => {
  console.error("Step 3 failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
