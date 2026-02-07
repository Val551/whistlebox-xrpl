import { Router } from "express";
import { STUB_MODE } from "../config.js";
import {
  approveEscrow as approveEscrowDb,
  getCampaignSummary as getCampaignSummaryDb,
  listCampaigns as listCampaignsDb,
  createCampaign as createCampaignDb
} from "../data/dbStore.js";
import {
  approveEscrow as approveEscrowStub,
  getCampaignSummary as getCampaignSummaryStub
} from "../data/stubStore.js";
import { badRequest, conflict, notFound } from "../httpErrors.js";
import { requireVerifierAuth } from "../verifierAuth.js";

const router = Router();

// Returns all campaigns for list views.
router.get("/", (req, res) => {
  if (STUB_MODE) {
    // In stub mode, return the single stub campaign
    const campaign = getCampaignSummaryStub("cityhall-001");
    return res.json(campaign ? [campaign] : []);
  }

  const campaigns = listCampaignsDb();
  return res.json({ campaigns });
});

// Returns a campaign with a minimal escrow summary for public display.
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const campaign = STUB_MODE
    ? getCampaignSummaryStub(id)
    : getCampaignSummaryDb(id);
  if (!campaign) {
    return notFound(res, "Campaign not found");
  }

  return res.json(campaign);
});

// Creates a new campaign (database mode only).
router.post("/", (req, res) => {
  if (STUB_MODE) {
    return badRequest(res, "Campaign creation not supported in stub mode");
  }

  const { id, title, description, journalistAddress, verifierAddress, goalXrp } = req.body;

  if (!id || !title || !description || !journalistAddress || !verifierAddress) {
    return badRequest(res, "Missing required campaign fields");
  }

  const campaign = createCampaignDb({
    id,
    title,
    description,
    journalistAddress,
    verifierAddress,
    goalXrp,
  });

  if (!campaign) {
    return conflict(res, "Campaign already exists");
  }

  return res.status(201).json(campaign);
});

// Verifier approval endpoint that releases an escrow in stub or DB mode.
router.post("/:id/escrows/:escrowId/approve", requireVerifierAuth, (req, res) => {
  const { id, escrowId } = req.params;
  const result = STUB_MODE
    ? approveEscrowStub(id, escrowId)
    : approveEscrowDb(id, escrowId);
  if (!result) {
    return notFound(res, "Campaign or escrow not found");
  }

  if ("alreadyReleased" in result && result.alreadyReleased) {
    return conflict(res, "Escrow already released");
  }

  return res.json({
    message: "Escrow approved and released (stub mode)",
    campaignId: id,
    escrowId,
    finishTx: result.finishTx,
    escrow: result.escrow
  });
});

export default router;
