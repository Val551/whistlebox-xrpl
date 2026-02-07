import { Wallet } from "xrpl";

const readEnv = (name: string) => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const requireEnv = (name: string) => {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`[XRPL_SIGNING_CONFIG] Missing required env: ${name}`);
  }
  return value;
};

const deriveClassicAddress = (seedEnvName: string) => {
  const seed = requireEnv(seedEnvName);
  try {
    return Wallet.fromSeed(seed).classicAddress;
  } catch {
    throw new Error(`[XRPL_SIGNING_CONFIG] Invalid seed in ${seedEnvName}`);
  }
};

const assertExpectedAddress = (
  role: "custody" | "verifier",
  expectedEnvName: "CUSTODY_WALLET_ADDRESS" | "VERIFIER_WALLET_ADDRESS",
  derivedAddress: string
) => {
  const expectedAddress = requireEnv(expectedEnvName);
  if (expectedAddress !== derivedAddress) {
    throw new Error(
      `[XRPL_SIGNING_CONFIG] ${role} signer mismatch: ${expectedEnvName}=${expectedAddress} but seed derives ${derivedAddress}`
    );
  }
};

// Fail-fast startup validation for real XRPL mode.
// Ensures the custody/verifier signing seeds resolve to the configured role addresses.
export const validateXrplSigningConfig = () => {
  const custodyAddress = deriveClassicAddress("CUSTODY_WALLET_SEED");
  const verifierAddress = deriveClassicAddress("VERIFIER_WALLET_SEED");

  assertExpectedAddress("custody", "CUSTODY_WALLET_ADDRESS", custodyAddress);
  assertExpectedAddress("verifier", "VERIFIER_WALLET_ADDRESS", verifierAddress);

  return {
    custodyAddress,
    verifierAddress
  };
};

