# Person 1 Frontend Implementation Guide

Date: 2026-02-07  
Scope: How to add Person 1 XRPL workflow UX in the frontend without changing backend responsibilities.

## Goal
Build a presentation-ready frontend flow for XRPL operations that feels like one guided experience, not isolated step buttons.

This guide covers:
- what to add in frontend files/components
- what users should see and do
- what should happen in app state and API calls
- how this connects to work owned by Persons 2, 3, and 4

## 1) What The Frontend Should Look Like
Add a single **XRPL Operations Dashboard** panel in the app with these sections in order:

1. Environment Readiness
2. Escrow Lock (Create)
3. Escrow Release (Finish)
4. Reference + Troubleshooting
5. Activity Log

This should read like one continuous workflow:
- initialize/check
- lock funds
- release funds
- explain/recover
- show proof of actions

## 2) Where To Add Changes
Primary location:
- `frontend/src/App.tsx`

Recommended split (optional but cleaner):
- `frontend/src/components/XrplOperationsDashboard.tsx`
- `frontend/src/components/xrpl/ReadinessCard.tsx`
- `frontend/src/components/xrpl/EscrowCreateCard.tsx`
- `frontend/src/components/xrpl/EscrowFinishCard.tsx`
- `frontend/src/components/xrpl/TroubleshootingPanel.tsx`
- `frontend/src/components/xrpl/ActivityLog.tsx`
- `frontend/src/lib/xrplApi.ts` (fetch helpers)

## 3) UI Flow And Behavior

### A) Environment Readiness
User action:
- Click `Initialize XRPL Session`.

Frontend should:
- Trigger setup/connectivity operations.
- Display wallet role summary and network health.

User should see:
- Loading state while checks run.
- Success card with wallet balances and network metadata.
- Error banner with actionable retry.
- Persisted readiness result after completion.

### B) Escrow Lock
User action:
- Enter amount and lock window, then click `Lock Funds in Escrow`.

Frontend should:
- Call EscrowCreate operation.
- Store returned `txHash`, `offerSequence`, `finishAfter`, `explorerUrl` as active escrow context.

User should see:
- Loading while submitting.
- Success state with transaction proof + link.
- Validation or ledger errors in-place.
- Last successful context should remain visible.

### C) Escrow Release
User action:
- Click `Release Escrow` from the active escrow context (or provide manual owner/offerSequence in advanced mode).

Frontend should:
- Prefer hash-based flow (derive owner+offerSequence from create tx).
- Submit EscrowFinish.

User should see:
- Waiting state if timelock not yet reached.
- Submission state once releasable.
- Success state with finish tx hash + explorer link.
- Friendly mapped errors:
  - `tecNO_PERMISSION`: too early, retry later
  - `tecNO_TARGET`: stale/wrong escrow target

### D) Reference + Troubleshooting
User action:
- Expand helper panel when needed.

Frontend should:
- Show `Owner + OfferSequence` explanation.
- Show error-specific recovery guidance.

User should see:
- Compact operator notes plus next action shortcuts.

### E) Activity Log
User action:
- Review timeline during demo.

Frontend should:
- Append entries for readiness, lock, release, and failures.

User should see:
- Chronological proof trail with tx hashes and timestamps.

## 4) State Model To Add
In `App.tsx` (or dashboard component), keep independent state buckets:

- `readinessState`: loading/error/result
- `createState`: loading/error/result
- `finishState`: loading/error/result
- `activeEscrowContext`: hash, owner, offerSequence, finishAfter
- `activityLog`: array of timestamped events
- `uiNotice`: global transient success/error message

Rules:
- Do not clear successful prior results when another action starts.
- Disable only relevant action controls while each action is running.

## 5) API Integration Expectations
Frontend should call backend endpoints dedicated to XRPL operations (provided by backend owner/Person 2 integration layer).

Expected operations:
- readiness/setup check
- connectivity test
- escrow create
- escrow finish

Frontend responsibilities:
- send request payloads
- handle non-2xx response bodies
- map known XRPL errors to user-friendly guidance
- keep raw engine result available for debugging view

## 6) Loading, Success, Error UX Rules
- Every action has its own spinner + disabled button state.
- Every success message includes tx hash when available.
- Every failure message includes short plain-English reason + retry action.
- Preserve explorer links for both create and finish txs.

## 7) How This Relates To Other Persons

### Person 2 (Backend API + Storage)
Dependency on Person 2:
- frontend needs stable endpoints and response contracts.
- backend should persist escrow identifiers (`ownerAddress`, `offerSequence`, `escrowCreateTx`) so release is deterministic.

Frontend contract with Person 2:
- frontend sends user inputs and receives structured operation results.
- frontend renders backend truth; it should not guess XRPL state.

### Person 3 (Public Campaign Frontend)
Relationship:
- this XRPL dashboard is an operator/technical workflow and complements Person 3 public campaign view.
- public campaign pages can reuse tx hashes/explorer links for transparency.

Boundary:
- keep public campaign UX simple; avoid exposing operator controls there.

### Person 4 (Verifier Dashboard + Demo Flow)
Relationship:
- Step 4 release behavior aligns directly with Person 4 verifier actions.
- same escrow status transitions should be reflected across both UIs.

Coordination:
- agree on shared status vocabulary (`locked`, `released`, `failed`) and update timing.

## 8) Suggested Demo Narrative
1. Initialize XRPL session (show readiness green).
2. Lock a new escrow (show create tx proof).
3. Release that escrow (show finish tx proof).
4. Open troubleshooting panel and explain common failures/recovery.
5. Show activity log as final proof trail.

## 9) Non-Goals For This Frontend Work
- Do not move XRPL signing/seeds to frontend.
- Do not bypass backend scripts/contracts for on-ledger actions.
- Do not mix operator dashboard controls into public campaign flow.

## 10) Delivery Checklist
- XRPL Operations Dashboard is present in frontend.
- All 5 sections are visible and coherent.
- Actions have clear loading/success/error behavior.
- Active escrow context persists between lock and release.
- Error mapping covers `tecNO_PERMISSION` and `tecNO_TARGET`.
- Activity log captures each significant action and result.
