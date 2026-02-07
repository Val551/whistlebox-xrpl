# Glass Box Journalism Funding — MVP User Stories

This document defines the **minimum user stories required for a presentable, end-to-end demo** of a glass-box funding system for investigative journalism using real XRPL testnet transactions.

---

## Epic 1 — Public Campaign Page (Transparency “Glass Box”)

### US-01: View Campaign Totals and Status

**As a public viewer**, I want to see totals for **Raised / Locked / Released** so I understand the campaign state at a glance.

**Acceptance Criteria**
- Campaign page renders without login.
- Shows three numbers:
  - Total Raised  
  - Total Locked  
  - Total Released
- Numbers update after a donation and after a release.
  - Real-time updates are preferred.
  - Manual refresh is acceptable for demo.

---

### US-02: View Key Addresses (Accountability Without Identity)

**As a public viewer**, I want to see the **journalist destination address** and **verifier address** so I know who receives funds and who can release them.

**Acceptance Criteria**
- Journalist XRPL address is displayed and labeled **“Journalist wallet”**.
- Verifier XRPL address is displayed and labeled **“Verifier”**.
- No donor identities (email, name, profile) are collected or displayed.

---

### US-03: Auditability via Transaction Links

**As a public viewer**, I want to click links to the **actual XRPL transactions** so I can verify actions on-chain.

**Acceptance Criteria**
- Every escrow creation shows a link to its XRPL explorer transaction.
- Every escrow release shows a link to its XRPL explorer transaction.
- Links open the correct network explorer (Testnet or Devnet).
- Transaction hashes correspond exactly to actions triggered by the app.

---

## Epic 2 — Donor Flow (Pseudonymous Funding + Real Escrow Lock)

### US-04: Make a Donation (Wallet Connect + Send)

**As a donor**, I want to donate test XRP from my wallet so I can support the campaign pseudonymously.

**Acceptance Criteria**
- Donor can connect a testnet-capable wallet.
- Donor can enter or select an amount.
- Basic validation exists:
  - Amount > 0
  - Reasonable maximum enforced
- Donation submits a real XRPL transaction.

---

### US-05: Donation Automatically Creates an Escrow (Funds Locked)

**As a donor**, I want my donation to be locked in XRPL escrow so funds cannot be taken before verification.

**Acceptance Criteria**
- After donating, the app creates an XRPL `EscrowCreate` (or equivalent) on Testnet/Devnet.
- Campaign displays the donation in a list showing:
  - Amount
  - Status = **Locked**
  - Escrow creation transaction hash with explorer link
- Journalist wallet does **not** receive funds at this step.

---

### US-06: Donor Sees Confirmation (No Identity Capture)

**As a donor**, I want confirmation that my donation is locked without providing personal information.

**Acceptance Criteria**
- Confirmation UI clearly indicates **“Funds locked”** state.
- App does not request email, name, or account creation.
- Donor wallet address is not publicly displayed.
- If shown locally, donor wallet is labeled **“Only visible to you”**.

---

## Epic 3 — Verifier Flow (Single-Action Release)

### US-07: Verifier Sees Pending Escrows

**As a verifier**, I want to see which escrows are awaiting approval so I can release the correct funds.

**Acceptance Criteria**
- A **Verifier** view or section exists.
- Lists escrows with status:
  - Locked
  - Pending verification
- Each escrow entry displays:
  - Amount
  - Identifier (transaction hash or escrow sequence)

---

### US-08: Verifier Triggers Escrow Release

**As a verifier**, I want to click one button to release funds so the journalist gets paid only after verification.

**Acceptance Criteria**
- Verifier connects their wallet.
- Clicking **“Approve & Release”** submits a real XRPL `EscrowFinish` (or equivalent) transaction.
- On success:
  - Escrow status changes to **Released**
  - Release transaction hash with explorer link is displayed
  - **Total Released** value updates accordingly

---

### US-09: Prevent Unauthorized Release

**As the system**, I must ensure only the verifier can release funds.

**Acceptance Criteria**
- If a non-verifier wallet attempts release:
  - UI blocks the action **OR**
  - XRPL transaction fails and a clear error is shown
- The verifier address used matches the one publicly displayed on the campaign page.
- No hidden or dynamic verifier switching during demo.

---

## Epic 4 — Journalist Proof (Box Opened + On-Chain Receipt)

### US-10: Journalist Receives Funds Upon Release

**As a journalist**, I want released funds to arrive at my wallet so I can demonstrate the **“box opened”** moment.

**Acceptance Criteria**
- After verifier approval:
  - Journalist wallet balance increases **OR**
  - Payment transaction to journalist wallet is visible via explorer
- Campaign page shows:
  - Escrow status = **Released**
  - Links to release and/or payment transactions
- UI clearly communicates the lifecycle:
  **Locked → Verified → Released**

---

## Minimum Presentable Workflow (Live Demo Checklist)

To be demo-ready, the following must be demonstrated live:

1. Open campaign page  
   → Show totals, journalist address, verifier address, starting state  
2. Donate test XRP  
   → Show escrow created, status **Locked**, transaction link  
3. Click escrow transaction link  
   → Show transaction exists on XRPL Testnet explorer  
4. Switch to verifier view  
   → Approve release, show **Released** status and transaction link  
5. Return to campaign page  
   → Totals updated; journalist receipt visible via explorer link  

---

**Outcome:**  
A complete, auditable, pseudonymous funding flow using real XRPL transactions — no mocks, no identity claims, no over-scoping.