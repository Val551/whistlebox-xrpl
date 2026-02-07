# Person 1 Step 5 Note: Escrow Identification (`Owner + OfferSequence`)

Date: 2026-02-07
Network: XRPL Testnet

## Why This Pair Is Required
On XRPL, `EscrowFinish` does not use the escrow tx hash as its primary identifier.
It identifies the escrow object using:

- `Owner`: the account that created/funded the escrow (`EscrowCreate.Account`)
- `OfferSequence`: the sequence number of that `EscrowCreate` transaction

`EscrowFinish` must submit both values, or it cannot target the escrow correctly.

## Field Mapping Rules
- `Owner` = `EscrowCreate.Account` (custody wallet in this project)
- `OfferSequence` = `EscrowCreate.Sequence`
- `EscrowFinish.Account` = account submitting finish (verifier wallet in this project)

`EscrowFinish.Account` can be different from `Owner`; in our flow, verifier submits finish while owner remains custody.

## How We Capture It In This Repo
From Step 3 (`backend/scripts/xrpl-escrow-create.ts`):
- log `tx hash`
- log `OfferSequence` (from validated tx `Sequence`)

For Step 4 (`backend/scripts/xrpl-escrow-finish.ts`), we allow:
- `XRPL_ESCROW_CREATE_TX_HASH` (preferred): script queries tx and derives `Owner + OfferSequence`
- or explicit:
  - `XRPL_ESCROW_OWNER_ADDRESS`
  - `XRPL_ESCROW_OFFER_SEQUENCE`

## Concrete Example From Our Test Runs
- EscrowCreate tx hash:
  `02A65EFE32295FE329D358CC88A0B30268CD407E1EC118DC0AFC5B15F153D802`
- Derived `Owner`:
  `rBATXfpyBz5oLvHq7e31FaAc2VuvEVtF5n`
- Derived `OfferSequence`:
  `14688965`
- EscrowFinish tx hash:
  `CCE9FB8A510C58007D3B165DCFF5139B65C8B52DF7B4ABA95DBBE1A6A101051F`

## Integration Contract For Backend Storage
Persist these fields per escrow record so release is deterministic:
- `escrowCreateTx`
- `ownerAddress` (Owner)
- `offerSequence` (OfferSequence)
- optional `finishAfter` for release timing checks

Without `Owner + OfferSequence`, Step 4 can fail with:
- `tecNO_TARGET` (escrow not found / already finished-canceled / wrong pair)
- `tecNO_PERMISSION` (attempted finish before timelock or not permitted at current ledger state)
