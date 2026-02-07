import { Router } from "express";
import { campaign, campaignId, escrows } from "../data/stub.js";

const router = Router();

router.get("/:id", (req, res) => {
  const { id } = req.params;
  if (id !== campaignId) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  return res.json({
    ...campaign,
    escrows: escrows.map((escrow) => ({
      id: escrow.id,
      amountXrp: escrow.amountXrp,
      status: escrow.status
    }))
  });
});

export default router;
