# Person 1 XRPL API Contract (Draft)

Date: 2026-02-07  
Purpose: Align Person 1 frontend workflow with backend endpoints that expose XRPL operations currently implemented as scripts.

## Scope
This contract defines HTTP endpoints the frontend can call for:
- wallet/setup readiness
- XRPL connectivity test
- escrow create
- escrow finish

It maps to existing script logic in:
- `backend/scripts/xrpl-wallet-bootstrap.ts`
- `backend/scripts/xrpl-websocket-smoke.ts`
- `backend/scripts/xrpl-escrow-create.ts`
- `backend/scripts/xrpl-escrow-finish.ts`

## Base
- Base URL: `http://localhost:3001`
- Prefix: `/api/xrpl`
- Content type: `application/json`

## Standard Response Envelope
Success:
```json
{
  "ok": true,
  "data": {}
}
```

Error:
```json
{
  "ok": false,
  "error": {
    "code": "XRPL_ENGINE_ERROR",
    "message": "EscrowFinish failed with result tecNO_TARGET",
    "details": {
      "engineResult": "tecNO_TARGET"
    }
  }
}
```

## 1) Readiness (Step 1 + optional health summary)
### `POST /api/xrpl/readiness/run`
Runs wallet setup/funding check and returns role balances.

Request body:
```json
{
  "ensureFunded": true
}
```

Response `200`:
```json
{
  "ok": true,
  "data": {
    "network": "wss://s.altnet.rippletest.net:51233",
    "roles": [
      {
        "role": "custody",
        "address": "r...",
        "balanceXrp": 100,
        "funded": false,
        "usedExistingCredentials": true
      },
      {
        "role": "journalist",
        "address": "r...",
        "balanceXrp": 100,
        "funded": false,
        "usedExistingCredentials": true
      },
      {
        "role": "verifier",
        "address": "r...",
        "balanceXrp": 100,
        "funded": false,
        "usedExistingCredentials": true
      }
    ]
  }
}
```

## 2) Connectivity Test (Step 2)
### `POST /api/xrpl/connectivity/test`
Runs websocket smoke test in assert mode.

Request body:
```json
{}
```

Response `200`:
```json
{
  "ok": true,
  "data": {
    "xrplWss": "wss://s.altnet.rippletest.net:51233",
    "connectedInMs": 430,
    "networkId": 1,
    "buildVersion": "3.1.0-rc2",
    "validatedLedgerSeq": 14690000,
    "completeLedgers": "12929081-14690000",
    "feeDrops": "10"
  }
}
```

## 3) Escrow Create (Step 3)
### `POST /api/xrpl/escrows/create`
Submits `EscrowCreate`.

Request body:
```json
{
  "amountXrp": "5",
  "finishAfterMinutes": 3
}
```

Behavior:
- If fields are omitted, backend may use env defaults.
- Backend validates values and returns clear validation errors.

Response `200`:
```json
{
  "ok": true,
  "data": {
    "sourceAddress": "rCUSTODY...",
    "destinationAddress": "rJOURNALIST...",
    "amountXrp": "5",
    "amountDrops": "5000000",
    "finishAfterIso": "2026-02-07T06:31:27.694Z",
    "finishAfterRipple": 823761088,
    "offerSequence": 14688965,
    "txHash": "02A65EFE32295FE329D358CC88A0B30268CD407E1EC118DC0AFC5B15F153D802",
    "ledgerIndex": 14691069,
    "explorerUrl": "https://testnet.xrpl.org/transactions/02A65EFE..."
  }
}
```

Validation error `400` example:
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid amountXrp"
  }
}
```

## 4) Escrow Finish (Step 4)
### `POST /api/xrpl/escrows/finish`
Submits `EscrowFinish` for a targeted escrow.

Request mode A (preferred, by create tx hash):
```json
{
  "escrowCreateTxHash": "02A65EFE32295FE329D358CC88A0B30268CD407E1EC118DC0AFC5B15F153D802"
}
```

Request mode B (explicit target):
```json
{
  "ownerAddress": "rBATXfpyBz5oLvHq7e31FaAc2VuvEVtF5n",
  "offerSequence": 14688965
}
```

Response `200`:
```json
{
  "ok": true,
  "data": {
    "finisherAddress": "rVERIFIER...",
    "ownerAddress": "rCUSTODY...",
    "offerSequence": 14688965,
    "escrowCreateTxHash": "02A65EFE...",
    "escrowCreateFinishAfterIso": "2026-02-07T06:31:28.000Z",
    "finishTxHash": "CCE9FB8A510C58007D3B165DCFF5139B65C8B52DF7B4ABA95DBBE1A6A101051F",
    "finishLedgerIndex": 14691127,
    "explorerUrl": "https://testnet.xrpl.org/transactions/CCE9FB8A..."
  }
}
```

Engine error `409` example:
```json
{
  "ok": false,
  "error": {
    "code": "XRPL_ENGINE_ERROR",
    "message": "EscrowFinish failed with result tecNO_PERMISSION",
    "details": {
      "engineResult": "tecNO_PERMISSION"
    }
  }
}
```

## Error Code Suggestions
- `VALIDATION_ERROR` (`400`)
- `MISSING_ENV` (`500` or `400` if request-driven)
- `XRPL_CONNECTIVITY_ERROR` (`503`)
- `XRPL_ENGINE_ERROR` (`409`)
- `INTERNAL_ERROR` (`500`)

## Frontend Mapping Rules
- On `ok: true`, update section-specific success state and activity log.
- On `XRPL_ENGINE_ERROR`:
  - `tecNO_PERMISSION` => show "Too early, wait and retry."
  - `tecNO_TARGET` => show "Escrow not found/already finished."
- Preserve last successful `EscrowCreate` context for release flow.

## Related Ownership (People)
- Person 1: defines UX workflow and XRPL operation semantics.
- Person 2: implements/maintains these backend endpoints and persistence.
- Person 3: can surface resulting tx hashes in public campaign UI.
- Person 4: verifier UI can consume `/api/xrpl/escrows/finish` results.

## Implementation Note
This is a draft contract. Final field names/status codes should be frozen jointly by Person 1 + Person 2 before frontend implementation begins.
