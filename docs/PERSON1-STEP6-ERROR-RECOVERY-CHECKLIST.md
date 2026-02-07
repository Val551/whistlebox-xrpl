# Person 1 Step 6: XRPL Error Cases and Recovery

Date: 2026-02-07
Network: XRPL Testnet

## Goal
Document common XRPL errors in this flow and define quick recovery steps.

## 1) `tecNO_PERMISSION` on `EscrowFinish`
When it happens:
- Finishing escrow before `FinishAfter` time is reached.
- Submitting too close to the timelock boundary.

How to detect:
- Step 4 command fails with:
  `EscrowFinish failed with result tecNO_PERMISSION`

Recovery:
1. Wait 20 to 60 seconds after `FinishAfter (ISO)`.
2. Retry Step 4 with same escrow hash:
   `XRPL_ESCROW_CREATE_TX_HASH=<hash> npm run xrpl:step4:test`
3. If it still fails, verify the hash points to an `EscrowCreate` and that `Owner + OfferSequence` match.

## 2) `tecNO_TARGET` on `EscrowFinish`
When it happens:
- Escrow already finished or canceled.
- Wrong `Owner + OfferSequence` pair (or wrong tx hash).

How to detect:
- Step 4 command fails with:
  `EscrowFinish failed with result tecNO_TARGET`

Recovery:
1. Do not retry same finished escrow repeatedly.
2. Create a fresh escrow:
   `npm run xrpl:step3:test`
3. Use the new EscrowCreate hash for Step 4:
   `XRPL_ESCROW_CREATE_TX_HASH=<new_hash> npm run xrpl:step4:test`

## 3) Sequence-related failures (account sequence mismatch)
When it happens:
- Two transactions from same wallet race close together.
- Retrying stale signed transactions.

Typical XRPL engine results:
- `tefPAST_SEQ`
- `tefMAX_LEDGER`
- `terPRE_SEQ`

Recovery:
1. Rebuild and resubmit a fresh transaction (do not reuse old signed blob).
2. Keep one in-flight tx per account for this demo flow.
3. Use current scripts (`submitAndWait`) so sequence/autofill are refreshed each run.

## 4) Network/WebSocket disconnects or unstable connectivity
When it happens:
- Temporary endpoint outage.
- Local network drop.

How to detect:
- Step 2 fails (connectivity smoke).
- Errors from websocket connect/request/submit phases.

Recovery:
1. Re-run connectivity check first:
   `npm run xrpl:step2:test`
2. If still failing, retry after 15 to 30 seconds.
3. Confirm `XRPL_WSS` is correct in `backend/.env`.
4. Re-run the intended step only after Step 2 passes.

## 5) Invalid amount/time inputs from env
When it happens:
- Bad `XRPL_ESCROW_AMOUNT_XRP` format.
- Bad `XRPL_ESCROW_FINISH_AFTER_MINUTES` value.

How to detect:
- Step 3 exits early with validation error messages.

Recovery:
1. Set valid values in `backend/.env`:
   - `XRPL_ESCROW_AMOUNT_XRP` positive decimal XRP
   - `XRPL_ESCROW_FINISH_AFTER_MINUTES` integer >= 1
2. Re-run:
   `npm run xrpl:step3:test`

## Fast Recovery Playbook
1. Verify network first:
   `cd backend && npm run xrpl:step2:test`
2. Create fresh escrow:
   `npm run xrpl:step3:test`
3. Finish using new hash:
   `XRPL_ESCROW_CREATE_TX_HASH=<hash> npm run xrpl:step4:test`

This sequence avoids stale identifiers and resolves most step-level failures quickly.
