# Person 1 Step 4 Status

Date: 2026-02-07
Network: XRPL Testnet (`wss://s.altnet.rippletest.net:51233`)

## Goal
Submit one `EscrowFinish` for a created escrow and log the transaction hash.

## Implementation
- Added `backend/scripts/xrpl-escrow-finish.ts`
- Added npm commands in `backend/package.json`:
  - `npm run xrpl:step4`
  - `npm run xrpl:step4:test`
- Added env keys in `backend/.env.example`:
  - `XRPL_ESCROW_CREATE_TX_HASH`
  - `XRPL_ESCROW_OWNER_ADDRESS`
  - `XRPL_ESCROW_OFFER_SEQUENCE`

## Test Run
Created a fresh escrow:

```bash
cd backend
npm run xrpl:step3:test
```

Step 3 output used for Step 4:
- EscrowCreate tx hash:
  `8FCBF53E4ACEC7EB05CCF6EAE298BC95E854C0DD024E4EF3AFE59C5311FC8923`
- OfferSequence: `14688963`
- FinishAfter (Ripple): `823759956`

Finished escrow:

```bash
cd backend
XRPL_ESCROW_CREATE_TX_HASH=8FCBF53E4ACEC7EB05CCF6EAE298BC95E854C0DD024E4EF3AFE59C5311FC8923 npm run xrpl:step4:test
```

Result snapshot:
- Finisher (verifier): `rGk73CbmbdwDA8E7yQLvjP8jZhsxAaT6tC`
- Escrow owner: `rBATXfpyBz5oLvHq7e31FaAc2VuvEVtF5n`
- OfferSequence: `14688963`
- Finish tx hash:
  `8FCCCBFEB0DDC85EE58DD5C45BF388BC9E06BEDF77E069CF3117A21E51B2591D`
- Validated ledger: `14690762`
- Explorer:
  `https://testnet.xrpl.org/transactions/8FCCCBFEB0DDC85EE58DD5C45BF388BC9E06BEDF77E069CF3117A21E51B2591D`

Step 4 is complete and verified with a real `EscrowFinish` on Testnet.
