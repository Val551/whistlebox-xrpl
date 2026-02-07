import "dotenv/config";
import express from "express";
import cors from "cors";
import campaignsRouter from "./routes/campaigns.js";
import donationsRouter from "./routes/donations.js";
import escrowsRouter from "./routes/escrows.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/campaigns", campaignsRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/escrows", escrowsRouter);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
