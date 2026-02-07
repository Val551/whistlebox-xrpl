# Whistlebox Demo Flow Checklist

> **Prerequisites**: Backend running with `STUB_MODE=true`, frontend running.
> No XRPL connection required for this demo.

---

## Step 1 — Open the Campaign Page (Person 3's UI)

- [ ] Navigate to `http://localhost:5173`
- [ ] **Expected**: Campaign page loads showing `cityhall-001` with total raised, locked, and released amounts
- [ ] Escrow list shows existing stub escrows with "pending" status

## Step 2 — Make a Donation

- [ ] Click the **Donate** button on the campaign page
- [ ] Enter a test amount (e.g., 25 XRP)
- [ ] Click **Submit**
- [ ] **Expected**: Success banner appears — "Donation received"
- [ ] Escrow list now includes a new entry with status **pending**

## Step 3 — Switch to Verifier Dashboard

- [ ] Navigate to `http://localhost:5173/verifier` (or the verifier route)
- [ ] **Expected**: Dashboard loads with stats bar (Pending / Released / Total)
- [ ] The newly created escrow appears under **Pending Review**

## Step 4 — Approve & Release an Escrow

- [ ] Click **✓ Approve & Release** on a pending escrow card
- [ ] **Expected**: Button shows "Releasing…" briefly
- [ ] **Expected**: Green success banner — "Escrow [id] released successfully"
- [ ] Escrow card moves from **Pending Review** section to **Released** section
- [ ] Status badge changes from `pending` (amber) to `released` (green)

## Step 5 — Verify State on Campaign Page

- [ ] Switch back to the campaign page
- [ ] Click refresh or reload the page
- [ ] **Expected**: Released amount has increased by the escrow amount
- [ ] The escrow entry now shows "released" status

## Step 6 — Check Explorer Links (once XRPL is integrated)

- [ ] On a released escrow, click the **🔗 EscrowCreate tx** link
- [ ] **Expected**: Opens XRPL Testnet explorer showing the real EscrowCreate transaction
- [ ] Click **🔗 EscrowFinish tx** link
- [ ] **Expected**: Opens explorer showing the EscrowFinish transaction
- [ ] Both transactions are publicly verifiable — this is the "glass box"

---

## Error Scenarios to Demo

| Scenario | How to trigger | Expected result |
|---|---|---|
| Backend offline | Stop the backend server | Error banner: "Failed to load escrows" |
| Double release | Click approve on already-released escrow | Error message from server (should not be possible if UI hides button) |
| Network timeout | Throttle network in devtools | Button stays in "Releasing…" state, then shows error |

---

## Key Talking Points for Presentation

1. **Glass box, not black box** — every XRP movement has a public transaction hash anyone can audit
2. **Pseudonymous donations** — no donor identity collected, just XRP sent to escrow
3. **Verification gate** — funds only release when a verifier approves, preventing misuse
4. **Stub mode** — the entire flow works without XRPL for development; real transactions plug in seamlessly
