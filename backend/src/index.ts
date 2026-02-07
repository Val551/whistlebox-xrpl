import "dotenv/config";
import express from "express";
import cors from "cors";
import campaignsRouter from "./routes/campaigns.js";
import donationsRouter from "./routes/donations.js";
import escrowsRouter from "./routes/escrows.js";
import { STUB_MODE } from "./config.js";
import { getDb } from "./db.js";
import { validateXrplSigningConfig } from "./xrplSigningConfig.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

// Initializes SQLite when not running in stub mode.
if (!STUB_MODE) {
  const { custodyAddress, verifierAddress } = validateXrplSigningConfig();
  console.log(
    `[XRPL_SIGNING_CONFIG] validated custody=${custodyAddress} verifier=${verifierAddress}`
  );
  getDb();
}

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const xrplWss = process.env.XRPL_WSS?.trim();
  const normalizedWss = xrplWss && xrplWss.length > 0 ? xrplWss : null;
  const loweredWss = normalizedWss?.toLowerCase() ?? "";
  const network = loweredWss.includes("devnet")
    ? "devnet"
    : loweredWss.includes("testnet") || loweredWss.includes("altnet")
      ? "testnet"
      : "unknown";

  res.json({
    ok: true,
    time: new Date().toISOString(),
    mode: STUB_MODE ? "stub" : "real-xrpl",
    network,
    xrplWss: normalizedWss
  });
});

app.use("/api/campaigns", campaignsRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/escrows", escrowsRouter);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
