# XRPL Acceptance Suite (US-RI-10)

Date: 2026-02-07  
Scope: End-to-end regression-safe validation for both `stub` and `real-xrpl` modes.

## Goal
Provide a reproducible test matrix and command checklist that validates:
- Stub baseline stories: `US-01`, `US-02`, `US-06`, `US-07`
- Real XRPL stories: `US-03`, `US-04`, `US-05`, `US-08`, `US-10`
- Safety controls from `US-RI-06` and `US-RI-09` (idempotency + auth)

## Prerequisites
- Backend dependencies installed in `backend/`
- Frontend dependencies installed in `frontend/`
- Backend and frontend `.env` files configured
- XRPL test wallets funded (`npm run xrpl:step1` from `backend/`)

## Mode Switch
- Stub mode: `backend/.env` -> `STUB_MODE=true`
- Real mode: `backend/.env` -> `STUB_MODE=false`

Restart backend after switching mode.

## Quick Smoke Commands
Run from `backend/`:

```bash
npm run xrpl:acceptance:stub
npm run xrpl:acceptance:real
```

These check health/campaign/escrow surfaces and assert expected mode.

## Test Matrix

| Story | Mode | Verification |
|---|---|---|
| US-01 (Totals/status) | Stub | Campaign and escrow views load with deterministic records |
| US-02 (Addresses visible) | Stub | Journalist/verifier addresses visible in UI and API |
| US-06 (No identity required) | Stub | Donation flow works without collecting donor identity |
| US-07 (Verifier pending list) | Stub | Pending escrows appear and move to released state |
| US-03 (Auditability links) | Real | Explorer links open valid XRPL transactions |
| US-04 (Real donation tx) | Real | Donation creates real `EscrowCreate` tx hash |
| US-05 (EscrowCreate network) | Real | `EscrowCreate` submits successfully on Testnet/Devnet |
| US-08 (EscrowFinish release) | Real | Release stores real `escrowFinishTx` |
| US-10 (Journalist receipt) | Real | UI/API show amount + destination + release tx proof |
| US-RI-06 (Idempotency) | Real | Duplicate donation/release requests return deterministic `409` |
| US-RI-09 (Auth hardening) | Real | Missing/invalid verifier token blocked (`401`/`403`) |

## Detailed Checklist

### A) Stub Baseline
1. Set `STUB_MODE=true`, restart backend.
2. Verify mode:
   ```bash
   curl -s http://localhost:3001/api/health
   ```
   Expected: `"mode":"stub"`
3. Run UI flow:
   - Create donation from campaign view
   - Verify escrow appears in pending list
   - Approve/release from verifier view
4. Confirm expected status transitions in UI.

### B) Real XRPL Flow
1. Set `STUB_MODE=false`, restart backend.
2. Verify mode:
   ```bash
   curl -s http://localhost:3001/api/health
   ```
   Expected: `"mode":"real-xrpl"`
3. Verify wallet readiness:
   ```bash
   npm run xrpl:step1
   ```
4. Create escrow in UI (small amount like `1` or `5` XRP).
5. Verify API escrow record includes real fields:
   ```bash
   curl -s http://localhost:3001/api/escrows
   ```
   Expected on newly created row:
   - `escrowCreateTx`: 64-char hash
   - `ownerAddress`: custody address
   - `offerSequence`: number
   - `createEngineResult`: `tesSUCCESS`
6. Release escrow from verifier UI after `finishAfter`.
7. Verify released row includes:
   - `escrowFinishTx`: 64-char hash
   - `destinationAddress`: journalist address
8. Open create/release explorer links from UI and confirm they resolve.

### C) Idempotency Tests (Real Mode)
1. Donation duplicate request:
   ```bash
   curl -s -X POST http://localhost:3001/api/donations \
     -H "Content-Type: application/json" \
     -d '{"campaignId":"cityhall-001","amountXrp":1,"requestId":"donation-idem-1"}'

   curl -s -X POST http://localhost:3001/api/donations \
     -H "Content-Type: application/json" \
     -d '{"campaignId":"cityhall-001","amountXrp":1,"requestId":"donation-idem-1"}'
   ```
   Expected: second response is deterministic duplicate conflict.
2. Release duplicate request:
   ```bash
   curl -s -X POST http://localhost:3001/api/escrows/<ESCROW_ID>/release \
     -H "Content-Type: application/json" \
     -H "x-verifier-token: dev-verifier-token" \
     -H "x-actor-id: test-user" \
     -d '{"requestId":"release:<ESCROW_ID>"}'

   curl -s -X POST http://localhost:3001/api/escrows/<ESCROW_ID>/release \
     -H "Content-Type: application/json" \
     -H "x-verifier-token: dev-verifier-token" \
     -H "x-actor-id: test-user" \
     -d '{"requestId":"release:<ESCROW_ID>"}'
   ```
   Expected: second response is deterministic duplicate conflict.

### D) Auth Tests (Real Mode)
1. Missing token:
   ```bash
   curl -i -X POST http://localhost:3001/api/escrows/<ESCROW_ID>/release \
     -H "Content-Type: application/json" \
     -d '{"requestId":"release:<ESCROW_ID>:missing"}'
   ```
   Expected: `401`
2. Invalid token:
   ```bash
   curl -i -X POST http://localhost:3001/api/escrows/<ESCROW_ID>/release \
     -H "Content-Type: application/json" \
     -H "x-verifier-token: wrong-token" \
     -H "x-actor-id: test-user" \
     -d '{"requestId":"release:<ESCROW_ID>:invalid"}'
   ```
   Expected: `403`
3. Valid token:
   ```bash
   curl -i -X POST http://localhost:3001/api/escrows/<ESCROW_ID>/release \
     -H "Content-Type: application/json" \
     -H "x-verifier-token: dev-verifier-token" \
     -H "x-actor-id: test-user" \
     -d '{"requestId":"release:<ESCROW_ID>:valid"}'
   ```
   Expected: request passes auth and continues to business logic.

Backend audit log expected:
- `[RELEASE_AUTH] outcome=deny_missing ...`
- `[RELEASE_AUTH] outcome=deny_invalid ...`
- `[RELEASE_AUTH] outcome=allow ...`

## Evidence to Capture
- `GET /api/health` response in stub mode
- `GET /api/health` response in real mode
- At least one real `EscrowCreate` tx hash + explorer URL
- At least one real `EscrowFinish` tx hash + explorer URL
- Duplicate donation conflict response
- Duplicate release conflict response
- Unauthorized (`401`) and forbidden (`403`) auth responses

## Known Caveats
- Seeded legacy rows may still contain placeholder tx fields; validate using newly created real-mode escrows.
- XRPL testnet timing/network variance can affect release timing around `finishAfter`.
- Faucet and account balances can cause `tecUNFUNDED`; top up custody wallet when needed.

