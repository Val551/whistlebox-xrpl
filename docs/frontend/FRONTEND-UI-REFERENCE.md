# Frontend UI Reference

Date: 2026-02-07  
Scope: What each frontend section does, how users interact with it, and what happens behind the scenes.

## Entry and Navigation

Primary files:
- `frontend/src/main.tsx`
- `components/Navigation` (left-side tab switcher)

What users see:
- 3 views: Campaign, Verifier, Whistleblower Dashboard
- A mode badge in the top-right:
  - `Stub Mode`
  - `Real XRPL Mode · testnet/devnet`

What the app does:
- On load, calls `GET /api/health`.
- Reads `mode`, `network`, and displays current backend mode.
- Keeps one shared visual background and switches active view.

---

## Campaign View (Donor + Public Transparency)

Primary file:
- `frontend/src/App.tsx`

### Hero Header
What users do:
- Read campaign title/description.
- Click `Refresh Data`.

Behind the scenes:
- `reloadData()` calls:
  - `GET /api/campaigns/:id`
  - `GET /api/escrows`
- Updates campaign totals and escrow list state.

### Funding Card
What users see:
- Total raised amount (`campaign.totalRaisedXrp`).

### Security Card
What users see:
- Total currently locked in escrow (`campaign.totalLockedXrp`).

### Support Card (Donate / Escrow Create)
What users do:
- Enter local wallet text (UI-only identity gate).
- Connect/disconnect wallet.
- Enter amount or pick preset.
- Click `Create Escrow`.

Behind the scenes:
- Validates amount and wallet connected.
- Sends `POST /api/donations` with:
  - `campaignId`
  - `amountXrp`
  - `requestId` (UUID, idempotency key)
- Handles outcomes:
  - Success: shows success message, stores latest donation, refreshes campaign/escrows.
  - Duplicate (`409` with duplicate): info message (`already processed`).
  - XRPL engine errors: mapped human-readable error text.
  - Loading: button text changes to `Submitting...`.

### Pending Card
What users see:
- Most recent locked escrow summary.
- `View Tx` explorer link (only if tx hash is valid 64-hex).

### Transparency Card
What users see:
- Count of active locked escrows.

### Released Card
What users see:
- Total released amount and lifecycle indicator.

### Confirmation Card
What users see:
- Most recent donation result (amount + escrow ID).
- `EscrowCreate Tx` link if valid tx hash exists.

### Journalist Proof Card
What users see:
- Latest released amount evidence.
- Destination address from released escrow record.
- `Release Tx` explorer link for valid real finish hash.
- If proof missing: explicit fallback (`Release proof unavailable for this record.`).

### Accountability Card
What users see:
- Journalist and verifier addresses.
- Explorer network label.

### All Escrows List
What users see:
- Full escrow list with status badges.
- Create/release tx links only for valid hashes.

---

## Verifier View (Approval + Release)

Primary file:
- `frontend/src/Verifier.tsx`

### Summary Cards
What users see:
- Pending count
- Released count
- Total escrow count

Data source:
- `fetchEscrows()` calls:
  - `GET /api/campaigns/:id`
  - `GET /api/escrows`

### Verifier Wallet Card
What users do:
- Enter verifier wallet address.
- Connect/disconnect wallet.

Behavior:
- UI requires connected wallet to match campaign verifier address.
- If mismatch, release buttons remain disabled.

### Pending Escrows Section
What users do:
- Click `Approve & Release`.

Behind the scenes:
- Pre-checks:
  - wallet connected
  - verifier address match
  - finishAfter not in future (client-side wait guidance)
  - verifier API token exists in env
- Sends `POST /api/escrows/:id/release` with:
  - `requestId: release:<escrowId>`
  - headers:
    - `x-verifier-token`
    - `x-actor-id`
- Handles outcomes:
  - Success: status success + refresh list.
  - `tecNO_PERMISSION`: informative wait message.
  - `tecNO_TARGET`: not found/already finished message.
  - Unauthorized (`401/403`): auth error shown.
  - Loading: button text changes to `Releasing...`.

### Released Escrows Section
What users see:
- Released escrow rows with:
  - amount
  - destination address
  - `Release Tx` link (valid hash only)

---

## Whistleblower Dashboard View

Primary file:
- `frontend/src/WhistleBlowerDashboard.tsx`

What users do:
- Create and manage campaigns.
- See aggregate campaign metrics.

Behind the scenes:
- Reads user campaign IDs from localStorage.
- Fetches campaigns from backend when available.
- Falls back to localStorage if backend unavailable.

---

## API Endpoints Used by Frontend

- `GET /api/health`
- `GET /api/campaigns/:id`
- `POST /api/campaigns`
- `POST /api/donations`
- `GET /api/escrows`
- `POST /api/escrows/:id/release`

---

## Environment Variables (Frontend)

Required:
- `VITE_API_BASE`
- `VITE_CAMPAIGN_ID`

For verifier auth path:
- `VITE_VERIFIER_API_TOKEN`

Optional display/network tuning:
- `VITE_XRPL_NETWORK`
- `VITE_XRPL_EXPLORER_BASE`
- `VITE_MAX_DONATION_XRP`

---

## Notes on Behavior

- Wallet text fields in Campaign and Verifier views are frontend-level gates, not wallet signing integrations.
- Real on-chain signing currently happens in backend using configured seeds.
- Explorer links are intentionally hidden for invalid/placeholder hashes to avoid fake proof surfaces.
