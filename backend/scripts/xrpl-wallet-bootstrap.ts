import "dotenv/config";
import { Client, Wallet, isValidClassicAddress, RippledError } from "xrpl";

type RoleName = "custody" | "journalist" | "verifier";

type RoleStatus = {
  role: RoleName;
  address: string;
  balanceXrp: number;
  funded: boolean;
  usedExistingCredentials: boolean;
  generatedSeed?: string;
};

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

async function getBalance(client: Client, address: string): Promise<number> {
  try {
    return await client.getXrpBalance(address);
  } catch (error) {
    // Account not found is expected for new wallets (balance = 0)
    if (error instanceof RippledError && (error.data as any)?.error === "actNotFound") {
      return 0;
    }
    // Re-throw unexpected errors (network failures, rate limiting, etc.)
    throw error;
  }
}

async function fundAddressWithFaucet(
  faucetUrl: string,
  address: string,
  amount = 1000,
): Promise<void> {
  const response = await fetch(faucetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destination: address,
      xrpAmount: amount,
      usageContext: "whistlebox-xrpl-step1",
      userAgent: "whistlebox-xrpl-step1-script",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Faucet request failed (${response.status}): ${body}`);
  }
}

async function ensureFundedSeedWallet(
  client: Client,
  role: Extract<RoleName, "custody" | "verifier">,
  seed: string | undefined,
): Promise<RoleStatus> {
  let wallet: Wallet;
  let usedExistingCredentials = true;
  let generatedSeed: string | undefined;

  if (seed) {
    wallet = Wallet.fromSeed(seed);
  } else {
    const funded = await client.fundWallet();
    wallet = funded.wallet;
    usedExistingCredentials = false;
    generatedSeed = wallet.seed;
  }

  let funded = false;
  let balance = await getBalance(client, wallet.classicAddress);
  if (balance < 10) {
    await client.fundWallet(wallet, { amount: "1000" });
    funded = true;
    balance = await getBalance(client, wallet.classicAddress);
  }

  return {
    role,
    address: wallet.classicAddress,
    balanceXrp: balance,
    funded,
    usedExistingCredentials,
    generatedSeed,
  };
}

async function ensureJournalistWallet(
  client: Client,
  faucetUrl: string,
  journalistSeed: string | undefined,
  journalistAddress: string | undefined,
): Promise<RoleStatus> {
  let address: string;
  let usedExistingCredentials = true;
  let generatedSeed: string | undefined;
  let funded = false;

  // Priority: seed > address > generate new
  if (journalistSeed) {
    const wallet = Wallet.fromSeed(journalistSeed);
    address = wallet.classicAddress;
  } else if (journalistAddress) {
    if (!isValidClassicAddress(journalistAddress)) {
      throw new Error("JOURNALIST_WALLET_ADDRESS is not a valid XRPL classic address.");
    }
    address = journalistAddress;
  } else {
    const fundedWallet = await client.fundWallet();
    address = fundedWallet.wallet.classicAddress;
    generatedSeed = fundedWallet.wallet.seed;
    usedExistingCredentials = false;
    funded = true;
  }

  // If we have an address but haven't funded yet, check balance and fund if needed
  if (!funded) {
    const balance = await getBalance(client, address);
    if (balance < 10) {
      await fundAddressWithFaucet(faucetUrl, address, 1000);
      funded = true;
    }
  }

  const balanceXrp = await getBalance(client, address);
  return {
    role: "journalist",
    address,
    balanceXrp,
    funded,
    usedExistingCredentials,
    generatedSeed,
  };
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
    const custodySeed = readEnv("CUSTODY_WALLET_SEED");
    const verifierSeed = readEnv("VERIFIER_WALLET_SEED");
    const journalistSeed = readEnv("JOURNALIST_WALLET_SEED");
    const journalistAddress = readEnv("JOURNALIST_WALLET_ADDRESS");

    const custody = await ensureFundedSeedWallet(client, "custody", custodySeed);
    const journalist = await ensureJournalistWallet(client, faucetUrl, journalistSeed, journalistAddress);
    const verifier = await ensureFundedSeedWallet(client, "verifier", verifierSeed);
    const roles: RoleStatus[] = [custody, journalist, verifier];

    console.log("Step 1 complete: wallet setup + funding check");
    console.log(`XRPL_WSS: ${xrplWss}`);
    console.log(`Faucet:   ${faucetUrl}`);
    console.log("");
    for (const role of roles) {
      const fundingState = role.funded ? "funded this run" : "already funded";
      const credentialState = role.usedExistingCredentials ? "existing credentials" : "generated";
      console.log(
        `${role.role.padEnd(10)} ${role.address} | balance=${role.balanceXrp} XRP | ${fundingState} | ${credentialState}`,
      );
    }

    const generated = roles.filter(
      (role): role is RoleStatus & { generatedSeed: string } => Boolean(role.generatedSeed),
    );
    if (generated.length > 0) {
      console.log("");
      console.log("Add these to backend/.env and keep them secret:");
      for (const role of generated) {
        if (role.role === "journalist") {
          console.log(`JOURNALIST_WALLET_ADDRESS=${role.address}`);
          console.log(`JOURNALIST_WALLET_SEED=${role.generatedSeed}`);
        } else if (role.role === "custody") {
          console.log(`CUSTODY_WALLET_SEED=${role.generatedSeed}`);
        } else if (role.role === "verifier") {
          console.log(`VERIFIER_WALLET_SEED=${role.generatedSeed}`);
        }
      }
    }
  } finally {
    await client.disconnect();
  }
}

main().catch((error) => {
  console.error("Step 1 failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
