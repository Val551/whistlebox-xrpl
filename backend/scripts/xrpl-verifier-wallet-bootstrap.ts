import "dotenv/config";
import { Client, Wallet } from "xrpl";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function inferFaucetUrl(wss: string): string {
  const fromEnv = readEnv("XRPL_FAUCET_URL");
  if (fromEnv) return fromEnv;

  if (wss.includes("altnet")) return "https://faucet.altnet.rippletest.net/accounts";
  if (wss.includes("devnet")) return "https://faucet.devnet.rippletest.net/accounts";

  throw new Error(
    "Could not infer faucet URL from XRPL_WSS. Set XRPL_FAUCET_URL in backend/.env.",
  );
}

async function main(): Promise<void> {
  const xrplWss = readEnv("XRPL_WSS");
  if (!xrplWss) {
    throw new Error("Missing XRPL_WSS in backend/.env");
  }

  const faucetUrl = inferFaucetUrl(xrplWss);
  const client = new Client(xrplWss);
  await client.connect();

  try {
    const existingVerifierSeed = readEnv("VERIFIER_WALLET_SEED");

    if (existingVerifierSeed) {
      // Use existing verifier wallet
      const wallet = Wallet.fromSeed(existingVerifierSeed);
      const balance = await client.getXrpBalance(wallet.classicAddress);
      console.log("Verifier wallet already exists (using existing credentials)");
      console.log(`Address: ${wallet.classicAddress}`);
      console.log(`Balance: ${balance} XRP`);

      if (balance < 10) {
        console.log("Funding existing verifier wallet...");
        await client.fundWallet(wallet, { amount: "1000" });
        const newBalance = await client.getXrpBalance(wallet.classicAddress);
        console.log(`New balance: ${newBalance} XRP`);
      }
    } else {
      // Generate new verifier wallet and fund it
      console.log("Generating new verifier wallet...");
      const fundedWallet = await client.fundWallet();
      const wallet = fundedWallet.wallet;

      // Fund it more for testing
      await client.fundWallet(wallet, { amount: "1000" });
      const balance = await client.getXrpBalance(wallet.classicAddress);

      console.log("Verifier wallet generated and funded");
      console.log("");
      console.log("Add this to backend/.env and keep it secret:");
      console.log(`VERIFIER_WALLET_SEED=${wallet.seed}`);
      console.log(`VERIFIER_WALLET_ADDRESS=${wallet.classicAddress}`);
      console.log("");
      console.log(`Balance: ${balance} XRP`);
    }
  } finally {
    await client.disconnect();
  }
}

main().catch((error) => {
  console.error("Verifier wallet setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
