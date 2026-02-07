import { Router } from "express";
import { escrows } from "../data/stub.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ escrows });
});

router.post("/:id/release", (req, res) => {
  const { id } = req.params;
  const escrow = escrows.find((item) => item.id === id);
  if (!escrow) {
    return res.status(404).json({ error: "Escrow not found" });
  }

  if (escrow.status === "released") {
    return res.status(400).json({ error: "Escrow already released" });
  }

  return res.json({
    message: "Escrow release simulated (stub mode)",
    escrowId: id,
    finishTx: "STUB-FINISH-TX"
  });
});

export default router;
