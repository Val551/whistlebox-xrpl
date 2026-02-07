import { Router } from "express";
import { STUB_MODE } from "../config.js";
import {
  isVerifierWhitelisted as isWhitelistedDb,
  listWhitelistedVerifiers as listDb,
  addVerifierToWhitelist as addDb,
  removeVerifierFromWhitelist as removeDb
} from "../data/dbStore.js";
import {
  isVerifierWhitelisted as isWhitelistedStub,
  listWhitelistedVerifiers as listStub,
  addVerifierToWhitelist as addStub,
  removeVerifierFromWhitelist as removeStub
} from "../data/stubStore.js";
import { badRequest, notFound } from "../httpErrors.js";

const router = Router();

// Convenience wrappers that pick the right store.
const isWhitelisted = STUB_MODE ? isWhitelistedStub : isWhitelistedDb;
const listVerifiers = STUB_MODE ? listStub : listDb;
const addVerifier = STUB_MODE ? addStub : addDb;
const removeVerifier = STUB_MODE ? removeStub : removeDb;

// GET /api/verifiers/:campaignId
// Lists all whitelisted verifier addresses for a campaign.
router.get("/:campaignId", (req, res) => {
  const { campaignId } = req.params;
  const verifiers = listVerifiers(campaignId);
  return res.json({ campaignId, verifiers });
});

// GET /api/verifiers/:campaignId/check?address=r...
// Checks if a specific address is on the whitelist.
router.get("/:campaignId/check", (req, res) => {
  const { campaignId } = req.params;
  const address = req.query.address as string | undefined;

  if (!address) {
    return badRequest(res, "address query parameter is required");
  }

  const allowed = isWhitelisted(address, campaignId);
  return res.json({ campaignId, address, allowed });
});

// POST /api/verifiers/:campaignId
// Adds an address to the whitelist.
// Body: { address: "r..." }
router.post("/:campaignId", (req, res) => {
  const { campaignId } = req.params;
  const { address } = req.body as { address?: string };

  if (!address || typeof address !== "string" || !address.startsWith("r")) {
    return badRequest(res, "A valid XRPL address (starting with r) is required");
  }

  addVerifier(address, campaignId);
  return res.status(201).json({ campaignId, address, added: true });
});

// DELETE /api/verifiers/:campaignId/:address
// Removes an address from the whitelist.
router.delete("/:campaignId/:address", (req, res) => {
  const { campaignId, address } = req.params;
  const removed = removeVerifier(address, campaignId);

  if (!removed) {
    return notFound(res, "Address not found in whitelist");
  }

  return res.json({ campaignId, address, removed: true });
});

export default router;
