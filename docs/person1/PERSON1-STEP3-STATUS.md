# Person 1 Step 3 Status

Date: 2026-02-07
Network: XRPL Testnet (`wss://s.altnet.rippletest.net:51233`)

## Goal
Submit one `EscrowCreate` with a short `FinishAfter` time lock and log the transaction hash.

## Implementation
- Added `backend/scripts/xrpl-escrow-create.ts`
- Added npm commands in `backend/package.json`:
  - `npm run xrpl:step3`
  - `npm run xrpl:step3:test`

## Test Run
Ran:

```bash
cd backend
npm run xrpl:step3:test
```

Result snapshot:
- Source (custody): `rBATXfpyBz5oLvHq7e31FaAc2VuvEVtF5n`
- Destination (journalist): `rJmaf3iK6HZvTkKm7UCQj3ayPvPZXnFwkv`
- Amount: `5 XRP` (`5000000 drops`)
- FinishAfter (ISO): `2026-02-07T05:48:23.076Z`
- FinishAfter (Ripple): `823758503`
- OfferSequence: `14688958`
- Validated ledger: `14690245`
- Tx hash: `16519FFEC2AF838BFB0E72CD156284618E6B2642E0FA7A51B50B0ED607473D50`
- Explorer:
  `https://testnet.xrpl.org/transactions/16519FFEC2AF838BFB0E72CD156284618E6B2642E0FA7A51B50B0ED607473D50`

Step 3 is complete and verified with a real `EscrowCreate` on Testnet.
