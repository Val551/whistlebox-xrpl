# API Surface (Backend)

Base URL (local): `http://localhost:3001`

All responses are JSON. No auth in MVP. Error responses follow `{ "error": "message" }`.

## `GET /api/health`
// Health check endpoint for local/dev monitoring.
```json
{
  "ok": true,
  "time": "2026-02-07T00:00:00.000Z"
}
```

Error cases:
- 500: `{ "error": "Internal server error" }`

## `GET /api/campaigns/:id`
// Returns a single campaign with a minimal escrow summary for public display.
```json
{
  "id": "cityhall-001",
  "title": "City Hall Contracts Investigation",
  "description": "Funding an investigative series into city hall procurement practices.",
  "journalistAddress": "rJOURNALISTADDRESS...",
  "verifierAddress": "rVERIFIERADDRESS...",
  "totalRaisedXrp": 150.5,
  "totalLockedXrp": 120.5,
  "totalReleasedXrp": 30.0,
  "escrowCount": 3,
  "status": "active",
  "escrows": [
    { "id": "escrow-0001", "amountXrp": 50.0, "status": "locked" }
  ]
}
```

Error cases:
- 404: `{ "error": "Campaign not found" }`

## `GET /api/escrows`
// Returns detailed escrow records for verifier and audit views.
```json
{
  "escrows": [
    {
      "id": "escrow-0001",
      "campaignId": "cityhall-001",
      "donationId": "donation-0001",
      "amountXrp": 50.0,
      "currency": "XRP",
      "escrowCreateTx": "A1B2C3D4...",
      "escrowFinishTx": null,
      "ownerAddress": "rCUSTODYADDRESS...",
      "destinationAddress": "rJOURNALISTADDRESS...",
      "condition": null,
      "fulfillment": null,
      "finishAfter": "2026-02-07T00:00:00.000Z",
      "status": "locked"
    }
  ]
}
```

Error cases:
- 500: `{ "error": "Internal server error" }`

## `POST /api/donations`
// Records a donation intent and creates an escrow (stub mode simulates this).
```json
{
  "campaignId": "cityhall-001",
  "amountXrp": 25,
  "requestId": "client-uuid-1234"
}
```

Response:
```json
{
  "message": "Donation received (stub mode)",
  "donationId": "donation-1707260000000",
  "escrowId": "escrow-1707260000000",
  "escrowCreateTx": "STUB-CREATE-TX"
}
```

Error cases:
- 400: `{ "error": "Invalid campaignId" }`
- 400: `{ "error": "Invalid amountXrp" }`
- 400: `{ "error": "Missing paymentTx or requestId" }`
- 409: `{ "error": "Duplicate donation" }`

## `POST /api/escrows/:id/release`
// Verifier approval endpoint that finishes an escrow (stub mode simulates this).
```json
{}
```

Response:
```json
{
  "message": "Escrow release simulated (stub mode)",
  "escrowId": "escrow-0001",
  "finishTx": "STUB-FINISH-TX"
}
```

Error cases:
- 404: `{ "error": "Escrow not found" }`
- 409: `{ "error": "Escrow already released" }`
- 409: `{ "error": "Escrow not eligible for release" }`

## `POST /api/campaigns/:id/escrows/:escrowId/approve`
// Verifier approval endpoint scoped to a campaign (stub or DB mode).
```json
{}
```

Response:
```json
{
  "message": "Escrow approved and released (stub mode)",
  "campaignId": "cityhall-001",
  "escrowId": "escrow-0001",
  "finishTx": "STUB-FINISH-TX",
  "escrow": {
    "id": "escrow-0001",
    "campaignId": "cityhall-001",
    "donationId": "donation-0001",
    "amountXrp": 50.0,
    "currency": "XRP",
    "escrowCreateTx": "A1B2C3D4...",
    "escrowFinishTx": "STUB-FINISH-TX",
    "ownerAddress": "rCUSTODYADDRESS...",
    "destinationAddress": "rJOURNALISTADDRESS...",
    "condition": null,
    "fulfillment": null,
    "finishAfter": "2026-02-07T00:00:00.000Z",
    "status": "released"
  }
}
```

Error cases:
- 404: `{ "error": "Campaign or escrow not found" }`
- 409: `{ "error": "Escrow already released" }`

## Stub Mode Notes
// When `STUB_MODE=true`, endpoints return deterministic sample data from `backend/src/data/stub.ts`.
- No XRPL calls are made.
- Donation and release operations return simulated tx hashes.
