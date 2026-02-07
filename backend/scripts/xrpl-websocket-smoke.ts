import "dotenv/config";
import { Client } from "xrpl";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

type SmokeReport = {
  xrplWss: string;
  connectedInMs: number;
  networkId: number | string;
  buildVersion: string;
  completeLedgers: string;
  validatedLedgerSeq: number;
  feeDrops: string;
};

async function runSmoke(assertMode: boolean): Promise<SmokeReport> {
  const xrplWss = readEnv("XRPL_WSS");
  if (!xrplWss) {
    throw new Error("Missing XRPL_WSS in backend/.env");
  }

  const client = new Client(xrplWss);
  const startedAt = Date.now();
  await client.connect();

  try {
    const connectedInMs = Date.now() - startedAt;
    const serverInfoResponse = await client.request({ command: "server_info" });
    const info = serverInfoResponse.result.info;
    const feeResponse = await client.request({ command: "fee" });
    const feeXrp = feeResponse.result.drops.open_ledger_fee;

    const validatedLedgerSeq = info.validated_ledger?.seq;
    if (typeof validatedLedgerSeq !== "number") {
      throw new Error("Server info did not include validated ledger sequence.");
    }

    const completeLedgers = info.complete_ledgers;
    if (typeof completeLedgers !== "string" || completeLedgers.length === 0) {
      throw new Error("Server info did not include complete ledger range.");
    }

    const report: SmokeReport = {
      xrplWss,
      connectedInMs,
      networkId: info.network_id ?? "unknown",
      buildVersion: info.build_version ?? "unknown",
      completeLedgers,
      validatedLedgerSeq,
      feeDrops: feeXrp,
    };

    if (assertMode) {
      if (connectedInMs > 15000) {
        throw new Error(`Connection was too slow for smoke assert: ${connectedInMs}ms`);
      }
      if (Number(feeXrp) <= 0) {
        throw new Error(`Fee check failed; expected positive drops fee, got ${feeXrp}`);
      }
    }

    return report;
  } finally {
    await client.disconnect();
  }
}

async function main(): Promise<void> {
  const assertMode = process.argv.includes("--assert");
  const report = await runSmoke(assertMode);

  console.log(assertMode ? "Step 2 test passed: XRPL WebSocket smoke assert" : "Step 2 complete: XRPL WebSocket smoke");
  console.log(`XRPL_WSS:           ${report.xrplWss}`);
  console.log(`Connected in:       ${report.connectedInMs}ms`);
  console.log(`Network ID:         ${report.networkId}`);
  console.log(`Build version:      ${report.buildVersion}`);
  console.log(`Validated ledger:   ${report.validatedLedgerSeq}`);
  console.log(`Complete ledgers:   ${report.completeLedgers}`);
  console.log(`Open ledger fee:    ${report.feeDrops} drops`);
}

main().catch((error) => {
  console.error("Step 2 failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
