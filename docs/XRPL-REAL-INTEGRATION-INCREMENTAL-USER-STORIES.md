# XRPL Real Integration: Incremental User Stories

Date: 2026-02-07  
Goal: Move from stub-backed behavior to real XRPL transaction flow while reusing current frontend structure (`frontend/src/App.tsx`, `frontend/src/Verifier.tsx`, `frontend/src/WhistleBlowerDashboard.tsx`).

## Context
Today, several flows are UI-complete but backend uses stub/placeholder tx values (including DB mode placeholders such as `DB-CREATE-TX-*`, `DB-FINISH-TX-*`).  
This backlog upgrades those flows to real XRPL Testnet/Devnet behavior in safe increments.

## Story Ordering
Implement in order. Each story is independently testable, reuses existing frontend screens, and minimizes rework.

## Traceability to Existing Stories
- Must become real XRPL: `US-03`, `US-04`, `US-05`, `US-08`, `US-10`
- Can remain stub-capable: `US-01`, `US-02`, `US-06`, `US-07`
- `US-09` is UI-partial today; real backend enforcement is included below as `US-RI-09`.

---

## US-RI-01: XRPL Capability Toggle + Health Surface
As a developer/operator, I want the backend to explicitly report XRPL capability and network status so frontend can distinguish stub vs real mode.

### Scope
- Add XRPL capability flags and network metadata to a backend endpoint (new or existing health endpoint).
- Frontend displays capability badge in existing UI.

### Acceptance Criteria
- API returns:
  - mode (`stub` or `real-xrpl`)
  - network (`testnet` or `devnet`)
  - XRPL endpoint URL
- Frontend shows clear status label:
  - `Stub Mode` or `Real XRPL Mode`
- No transaction behavior changes yet.

---

## US-RI-02: Real EscrowCreate Backend Path
As a donor flow system, I want donation escrow creation to submit a real `EscrowCreate` transaction and persist real tx data.

Depends on: `US-RI-01`

### Scope
- Wire backend donation/create flow to XRPL client logic.
- Persist real fields:
  - `escrowCreateTx`
  - `ownerAddress`
  - `offerSequence`
  - `finishAfter`
  - engine result/status
- Keep stub behavior behind mode toggle.

### Acceptance Criteria
- In real mode, donation creates real on-ledger `EscrowCreate` (tesSUCCESS).
- Persisted escrow record has actual tx hash (not placeholder).
- Explorer link resolves to real transaction.
- Frontend existing donation flow still works without UI rewrite.

---

## US-RI-03: Real EscrowFinish Backend Path
As a verifier, I want release to submit real `EscrowFinish` using `Owner + OfferSequence`.

Depends on: `US-RI-02`

### Scope
- Wire release endpoint to real `EscrowFinish`.
- Resolve target via persisted `ownerAddress + offerSequence` (or create hash lookup).
- Respect timelock (`FinishAfter`) before submission.

### Acceptance Criteria
- In real mode, release executes real `EscrowFinish` and persists `escrowFinishTx`.
- Frontend existing release actions show real tx hash/explorer link.
- Known XRPL errors are mapped:
  - `tecNO_PERMISSION` -> too early
  - `tecNO_TARGET` -> missing/already finished target

---

## US-RI-04: Transaction Proof Integrity in UI (US-03)
As an auditor/viewer, I want every tx link in UI to point to real XRPL transactions.

Depends on: `US-RI-02`, `US-RI-03`

### Scope
- Reuse existing link components in `App.tsx` / `Verifier.tsx`.
- Ensure data source provides real hashes for create/release.

### Acceptance Criteria
- Escrow create/release links in UI open valid explorer pages.
- No `STUB-*` or `DB-*` placeholder hashes shown in real mode.
- UI gracefully handles missing hash (hidden link, no crash).

---

## US-RI-05: Wallet Ownership and Signing Rules
As a platform operator, I want clear signing ownership so only intended keys sign each transaction.

Depends on: `US-RI-02`, `US-RI-03`

### Scope
- Define and enforce:
  - custody signs `EscrowCreate`
  - verifier signs `EscrowFinish` (or approved policy)
- Validate configured addresses match derived seed addresses at startup.

### Acceptance Criteria
- Startup/config validation fails fast on wallet mismatch.
- Signed transactions come from expected account in explorer record.
- Misconfigured seeds produce explicit API error.

---

## US-RI-06: Idempotency and Replay Safety for Real Mode
As backend owner, I want retries not to duplicate on-ledger side effects.

Depends on: `US-RI-02`, `US-RI-03`

### Scope
- Enforce idempotency for donation and release actions in real mode.
- Store request IDs / tx correlation fields.

### Acceptance Criteria
- Repeating same donation request does not create multiple escrows.
- Repeating same release action does not create multiple finish attempts.
- API returns deterministic conflict response for duplicate requests.

---

## US-RI-07: Frontend UX States for Real Ledger Latency
As a user/verifier, I want clear feedback when XRPL actions take time.

Depends on: `US-RI-02`, `US-RI-03`

### Scope
- Reuse existing frontend screens and add state messaging:
  - submitting
  - waiting for validation
  - waiting for timelock
  - success/failure
- No major redesign required.

### Acceptance Criteria
- Create/release actions show loading and final status.
- Timelock waits display actionable message.
- Errors show mapped message + raw engine code (for debugging).

---

## US-RI-08: Journalist Receipt Evidence (US-10)
As a journalist, I want proof that funds were actually released to destination wallet.

Depends on: `US-RI-03`, `US-RI-04`

### Scope
- On successful release, store and expose:
  - finish tx hash
  - destination address
  - released amount
- Optional: post-release destination balance snapshot.

### Acceptance Criteria
- UI/API shows release proof tied to journalist address.
- Explorer confirms destination and amount consistency.
- No placeholder receipt in real mode.

---

## US-RI-09: Authorization Hardening for Release (US-09 real enforcement)
As a platform owner, I want unauthorized users blocked from triggering release.

Depends on: `US-RI-03`

### Scope
- Add backend auth/authorization around release endpoints.
- Keep verifier role constraints explicit.

### Acceptance Criteria
- Unauthenticated/unauthorized requests cannot release escrow.
- Authorized verifier flow still succeeds.
- Audit logs include actor and decision outcome.

---

## US-RI-10: End-to-End Acceptance Suite (Stub + Real)
As the team, we want regression-safe validation for both stub and real modes.

Depends on: `US-RI-01` through `US-RI-09`

### Scope
- Add automated and manual checklist coverage:
  - stub mode baseline stories
  - real mode stories requiring live XRPL
- Include smoke scripts/commands in docs.

Implementation artifact:
- `docs/XRPL-ACCEPTANCE-SUITE.md`
- `backend/scripts/xrpl-acceptance-smoke.sh`

### Acceptance Criteria
- Test matrix covers:
  - US-01, US-02, US-06, US-07 in stub mode
  - US-03, US-04, US-05, US-08, US-10 in real mode
- Real mode tests include actual tx hashes from explorer.
- CI/non-CI instructions are documented for reproducible runs.

---

## Mapping to Existing Files (Reuse Plan)
- Frontend:
  - `frontend/src/App.tsx` (campaign + donation + escrow visibility)
  - `frontend/src/Verifier.tsx` (release actions and status)
  - `frontend/src/WhistleBlowerDashboard.tsx` (campaign management context)
- Backend:
  - `backend/src/routes/donations.ts`
  - `backend/src/routes/escrows.ts`
  - `backend/src/routes/campaigns.ts`
  - `backend/src/routes/xrpl.ts` (XRPL-specific operational path)
  - `backend/src/data/dbStore.ts` (persistence fields)

## Definition of Done for “Real XRPL Integration Complete”
- Real mode creates and finishes escrows on XRPL Testnet/Devnet.
- Frontend displays real tx hashes and explorer links.
- Backend persists release-critical identifiers (`ownerAddress`, `offerSequence`).
- Authorization and idempotency are enforced.
- Stub mode remains functional for offline/demo fallback.
