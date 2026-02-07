# Person 1 ↔ Person 2 Integration Handoff

Date: 2026-02-07  
Purpose: Define the working contract between:
- Person 1 (XRPL Core Transactions + frontend workflow requirements)
- Person 2 (Backend API + storage implementation)

## 1) Role Boundary

### Person 1 owns
- XRPL transaction flow semantics:
  - wallet readiness behavior
  - connectivity checks
  - `EscrowCreate`
  - `EscrowFinish`
- Required identifiers and timing rules:
  - `Owner + OfferSequence`
  - `FinishAfter` handling
- Frontend UX requirements for operator flow and error interpretation.

### Person 2 owns
- HTTP API implementation in backend.
- Persistence model and data durability.
- Idempotency, validation, and consistent error responses.
- Mapping script/domain logic to stable API contracts.

## 2) Shared Contract Artifacts
- `docs/PERSON1-XRPL-API-CONTRACT-DRAFT.md` (endpoint/request/response contract)
- `docs/PERSON1-STEP5-OWNER-OFFERSEQUENCE-NOTE.md` (identifier semantics)
- `docs/PERSON1-STEP6-ERROR-RECOVERY-CHECKLIST.md` (error mapping + recovery)
- `shared/contract.json` (high-level data shapes for campaign/escrow/donation)

## 3) API Surface Person 2 Should Provide
Prefix: `/api/xrpl`

- `POST /readiness/run`
- `POST /connectivity/test`
- `POST /escrows/create`
- `POST /escrows/finish`

Response envelope:
- success: `{ "ok": true, "data": {...} }`
- error: `{ "ok": false, "error": { "code", "message", "details?" } }`

## 4) Data Fields Person 2 Must Persist For Escrow Release
For each escrow created, persist:
- `escrowCreateTx` (hash)
- `ownerAddress` (`EscrowCreate.Account`)
- `offerSequence` (`EscrowCreate.Sequence`)
- `finishAfter` (optional but strongly recommended)
- status lifecycle (`locked` -> `released` or `failed`)

Reason:
- `EscrowFinish` targeting is deterministic only with `Owner + OfferSequence`.

## 5) Frontend Dependency Expectations (Person 1 -> Person 2)
Person 1 frontend expects Person 2 backend to:
- expose stable field names from the draft contract
- return engine results in error details when available
- avoid changing response schema without notice
- support hash-based finish flow:
  - request with `escrowCreateTxHash`
  - backend derives `Owner + OfferSequence`

## 6) Error Handling Agreement
Suggested backend error codes:
- `VALIDATION_ERROR`
- `XRPL_CONNECTIVITY_ERROR`
- `XRPL_ENGINE_ERROR`
- `INTERNAL_ERROR`

Minimum mapping details returned to frontend:
- engine result string when applicable (`tecNO_PERMISSION`, `tecNO_TARGET`, etc.)

## 7) Integration Sequence
1. Person 2 implements endpoints with mock/stub shape parity first.
2. Person 2 wires endpoint internals to existing XRPL script/domain logic.
3. Person 1 wires frontend dashboard to these endpoints.
4. Joint test:
   - readiness
   - connectivity
   - create escrow
   - finish escrow
5. Joint verify error UX:
   - forced/observed `tecNO_PERMISSION`
   - stale target `tecNO_TARGET`

## 8) Acceptance Criteria For Person 1 ↔ Person 2 Integration
- Frontend can run full XRPL workflow without CLI use.
- `EscrowCreate` and `EscrowFinish` tx hashes are visible in UI.
- Finish action works from tx-hash mode (derived owner/sequence).
- Error states are explicit and actionable in UI.
- Persisted backend records survive restart and keep release identifiers.

## 9) Change Management Rule
If Person 2 changes endpoint fields/status codes, update:
- `docs/PERSON1-XRPL-API-CONTRACT-DRAFT.md`
- this handoff file
before frontend implementation changes are merged.
