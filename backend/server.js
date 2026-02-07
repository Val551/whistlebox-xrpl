import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import xrpl from "xrpl";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "backend" });
});

// Quick XRPL connectivity check
app.get("/xrpl/ping", async (_req, res) => {
  const url = process.env.XRPL_WS_URL;
  if (!url) return res.status(500).json({ ok: false, error: "Missing XRPL_WS_URL" });

  const client = new xrpl.Client(url);
  try {
    await client.connect();
    const info = await client.request({ command: "server_info" });
    await client.disconnect();
    res.json({ ok: true, server: info.result.info.pubkey_node ?? "connected" });
  } catch (e) {
    try { await client.disconnect(); } catch {}
    res.status(500).json({ ok: false, error: String(e) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
