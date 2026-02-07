# Person 3 Integration Guide (Frontend ↔ Backend)

This guide helps Person 3 integrate the public campaign frontend with the Backend API + Storage services while staying aligned with the glass‑box funding goal in `docs/PROJECT-IDEA.md`.

## What You’re Integrating
- Campaign summary and escrow list for transparency
- Donation CTA that creates an escrow
- Explorer links for escrow transactions (placeholder until XRPL integration)

## Step‑by‑Step Integration
1. Start the backend in stub mode.
   - Set `STUB_MODE=true` in `backend/.env` and run `npm run dev`.
2. Set the frontend API base.
   - In `frontend/.env`, set `VITE_API_BASE=http://localhost:3001`.
3. Fetch campaign summary on page load.
   - Call `GET /api/campaigns/:id` with `cityhall-001`.
   - Use `totalRaisedXrp`, `totalLockedXrp`, `totalReleasedXrp`, and `escrows` summary.
4. Fetch full escrows for the list view.
   - Call `GET /api/escrows` and render each escrow’s `amountXrp`, `status`, and tx hashes.
5. Wire the donation CTA to create escrow.
   - Call `POST /api/donations` with:
     - `campaignId` = `cityhall-001`
     - `amountXrp` = user input
     - `requestId` = a unique client ID (use `crypto.randomUUID()` in the browser)
6. Handle idempotency errors.
   - If the donation call returns `409`, show “already processed” and reuse the returned IDs.
7. Add empty/error states.
   - Show a clear error when API calls fail (backend offline or bad input).
8. Add placeholder explorer links.
   - Use the returned `escrowCreateTx`/`escrowFinishTx` values.
   - For now, link format can be a placeholder; replace with real XRPL explorer URLs later.

## Required Request/Response Notes
- All errors are `{ "error": "..." }` with status codes:
  - `400` invalid input
  - `404` not found
  - `409` duplicate/invalid state
- Donation requests must include `requestId` or `paymentTx` to avoid duplicate escrows.
- Full API details live in `docs/api/API.md`.

## Measurement of Success
- Campaign page renders using `/api/campaigns/:id` within 2 seconds.
- Escrow list renders using `/api/escrows`.
- Donation CTA shows a success banner and displays the new `escrowId`.
- Duplicate donation with the same `requestId` returns `409` and does not create a new escrow.
- All errors are handled with user‑friendly messaging (backend offline, invalid input).
