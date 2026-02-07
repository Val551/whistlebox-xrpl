# Person 1 XRPL Core Transactions Runbook (Steps 1-6)

Date: 2026-02-07  
Scope: End-to-end guide for Person 1 in `docs/PROJECT-IMPLEMENTATION.md` (`XRPL Core Transactions`)

## 1) Purpose
This runbook documents how to execute and verify all Person 1 steps:
1. Wallet setup/funding
2. XRPL WebSocket connectivity
3. `EscrowCreate`
4. `EscrowFinish`
5. `Owner + OfferSequence` identification note
6. Error/recovery checklist

## 2) Dependencies
Required:
- Node.js `18+`
- npm
- `xrpl` package (already included in `backend/package.json`)
- Testnet/Devnet XRPL WebSocket endpoint

Backend dependency snapshot (`backend/package.json`):
- Runtime: `cors`, `dotenv`, `express`, `xrpl`
- Dev: `typescript`, `tsx`, `@types/*`

## 3) Files Added For Steps 1-6
Scripts:
- `backend/scripts/xrpl-wallet-bootstrap.ts` (Step 1)
- `backend/scripts/xrpl-websocket-smoke.ts` (Step 2)
- `backend/scripts/xrpl-escrow-create.ts` (Step 3)
- `backend/scripts/xrpl-escrow-finish.ts` (Step 4)

Step docs:
- `docs/PERSON1-STEP1-STATUS.md`
- `docs/PERSON1-STEP2-STATUS.md`
- `docs/PERSON1-STEP3-STATUS.md`
- `docs/PERSON1-STEP4-STATUS.md`
- `docs/PERSON1-STEP5-OWNER-OFFERSEQUENCE-NOTE.md`
- `docs/PERSON1-STEP6-ERROR-RECOVERY-CHECKLIST.md`

Consolidated doc:
- `docs/PERSON1-XRPL-CORE-TRANSACTIONS-RUNBOOK.md` (this file)

## 4) Required Environment Variables
Use `backend/.env.example` as source of truth.

Core:
- `XRPL_WSS`
- `XRPL_EXPLORER`
- `CUSTODY_WALLET_SEED`
- `JOURNALIST_WALLET_ADDRESS`
- `VERIFIER_WALLET_SEED`

Optional/step-specific:
- `XRPL_FAUCET_URL`
- `XRPL_ESCROW_AMOUNT_XRP` (default `5`)
- `XRPL_ESCROW_FINISH_AFTER_MINUTES` (default `3`)
- `XRPL_ESCROW_CREATE_TX_HASH`
- `XRPL_ESCROW_OWNER_ADDRESS`
- `XRPL_ESCROW_OFFER_SEQUENCE`

## 5) Step-by-Step Execution
Run from repo root unless specified.

### Step 1: Fund and label wallets
Command:
```bash
cd backend
npm run xrpl:step1
```
Pass criteria:
- Script prints `custody`, `journalist`, `verifier` addresses and balances.
- Wallets are funded and reusable for next steps.

### Step 2: WebSocket smoke test
Command:
```bash
cd backend
npm run xrpl:step2:test
```
Pass criteria:
- Connects to XRPL endpoint
- Returns validated ledger + fee data

### Step 3: Submit EscrowCreate
Command:
```bash
cd backend
npm run xrpl:step3:test
```
Pass criteria:
- `tesSUCCESS`
- Logs `Tx hash`, `OfferSequence`, `FinishAfter`

Output to keep:
- `EscrowCreate tx hash`
- `OfferSequence`
- `FinishAfter`

### Step 4: Submit EscrowFinish
Preferred command (derive `Owner + OfferSequence` from create hash):
```bash
cd backend
XRPL_ESCROW_CREATE_TX_HASH=<step3_hash> npm run xrpl:step4:test
```
Alternative:
Set both `XRPL_ESCROW_OWNER_ADDRESS` and `XRPL_ESCROW_OFFER_SEQUENCE` explicitly.

Pass criteria:
- `tesSUCCESS`
- Logs finish tx hash and validated ledger

Notes:
- Step 4 can wait until `FinishAfter` is reached.
- Reusing an already-finished escrow can fail with `tecNO_TARGET`.

### Step 5: Document escrow identification
Deliverable:
- `docs/PERSON1-STEP5-OWNER-OFFERSEQUENCE-NOTE.md`

What must be clear:
- `EscrowFinish` targets escrow via `Owner + OfferSequence`
- Mapping from `EscrowCreate.Account` + `EscrowCreate.Sequence`

### Step 6: Document error/recovery cases
Deliverable:
- `docs/PERSON1-STEP6-ERROR-RECOVERY-CHECKLIST.md`

Minimum covered:
- Sequence errors
- Timelock errors
- Disconnect/network issues

## 6) Script Command Reference
From `backend/package.json`:
- `npm run xrpl:step1`
- `npm run xrpl:step2`
- `npm run xrpl:step2:test`
- `npm run xrpl:step3`
- `npm run xrpl:step3:test`
- `npm run xrpl:step4`
- `npm run xrpl:step4:test`

## 7) End-to-End Validation Sequence (Recommended)
```bash
cd backend
npm run build
npm run xrpl:step1
npm run xrpl:step2:test
npm run xrpl:step3:test
XRPL_ESCROW_CREATE_TX_HASH=<new_hash_from_step3> npm run xrpl:step4:test
```

If this passes, Steps 1-4 are operational and Steps 5-6 docs should match observed behavior.

## 8) Known Failure Modes
See `docs/PERSON1-STEP6-ERROR-RECOVERY-CHECKLIST.md` for full details.

Quick mapping:
- `tecNO_PERMISSION`: too early / timelock boundary; wait and retry
- `tecNO_TARGET`: stale or wrong escrow target; create fresh escrow
- sequence errors (`tefPAST_SEQ`, `terPRE_SEQ`, `tefMAX_LEDGER`): rebuild/retry fresh tx
- connectivity errors: rerun Step 2 first, then continue

## 9) Security Notes
- Never commit real wallet seeds.
- Keep `backend/.env` local and secret.
- Only commit `backend/.env.example`.

## 10) Handoff Checklist
- Step docs exist and are updated for latest run
- Scripts run successfully on Testnet
- `Owner + OfferSequence` mapping is documented for backend integration
- Error recovery playbook is documented and actionable
