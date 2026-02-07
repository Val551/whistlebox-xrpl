Person 1: XRPL Core Transactions
Description: Own on-ledger actions for the glass-box funding flow while keeping the backend and frontend able to work in stub mode.

Responsibilities:
- Wallet setup and funding on XRPL Testnet/Devnet (custody, journalist, verifier)
- Implement and document the 3 core XRPL actions: detect donation payment, EscrowCreate, EscrowFinish
- Provide verified transaction hash examples for demo links

Numbered steps:
1. Fund and label custody, journalist, and verifier wallets on Testnet/Devnet.
2. Build a minimal Node script that connects to XRPL via WebSocket using xrpl.js.
3. Submit one EscrowCreate with a short FinishAfter time lock and log the tx hash.
4. Submit EscrowFinish for that escrow and log the tx hash.
5. Write a short note explaining Owner + OfferSequence for escrow identification.
6. Document 3 to 5 common error cases (sequence, time lock, disconnects) and how to recover.

Measurements of success:
- One real EscrowCreate and EscrowFinish appear on Testnet/Devnet with logged hashes.
- Escrow identification notes are clear enough for backend integration (Owner + OfferSequence).
- Script runs end-to-end twice without manual ledger surgery.

Inputs (min dependencies):
- Testnet WebSocket URL (fixed in backend .env)
- xrpl.js (already in backend dependencies)
- Wallet seeds/addresses stored in backend .env only
- Shared campaignId format (hardcode `cityhall-001`)

Outputs (contracts to others):
- One Node script that executes EscrowCreate then EscrowFinish and prints tx hashes
- Clarified rules for escrow identification (Owner + OfferSequence) and timing (FinishAfter)
- A short checklist for common XRPL errors (sequence, time locks, network hiccups)

Acceptance:
- A real EscrowCreate and EscrowFinish on Testnet/Devnet with links that can be pasted into the demo UI
- Written notes explaining OfferSequence usage and time-lock constraints

Next step:
- Write a tiny Node script that connects to Testnet and submits one EscrowCreate, then one EscrowFinish, and logs tx hashes.


Person 2: Backend API + Storage
Description: Own the Express API and persistence so the frontend and verifier UI can work independently of XRPL until integration.

Responsibilities:
- Implement API routes for campaigns, donations, escrows, and approve/release
- Provide stub mode that returns deterministic sample data
- Add persistence (JSON or SQLite) and idempotency for donation events

Numbered steps:
1. Confirm response shapes against `shared/contract.json` and stub data.
2. Implement campaign, escrows, donations, and approve/release routes in Express.
3. Add a local store (JSON or SQLite) and load on startup.
4. Add idempotency checks for duplicate donation events.
5. Return clear error responses for invalid input and duplicate events.

Measurements of success:
- Server restarts do not lose campaign or escrow data.
- Duplicate donation submissions do not create extra escrows.
- Frontend and verifier can run entirely on stub mode without XRPL.

Inputs (min dependencies):
- Shared JSON contract in `shared/contract.json`
- Campaign ID and sample data (already in stub module)

Outputs (contracts to others):
- Stable endpoints and response shapes for frontend and verifier UI
- Local store that survives restart (JSON or SQLite)
- Error and retry patterns for duplicate donation detection

Acceptance:
- Frontend can load campaign and escrows without XRPL running
- Verifier UI can call a stub approve endpoint and see state updates

Next step:
- Extend existing Express skeleton with a local JSON or SQLite store and stub routes returning sample data.


Person 3: Public Campaign Frontend
Description: Own the public campaign page showing raised, locked, released, and escrow transparency links.

Responsibilities:
- Build UI for campaign summary, escrow list, donation CTA
- Handle loading and error states using stub API responses
- Format XRP values cleanly and link to explorer URLs

Numbered steps:
1. Build layout for campaign summary and escrow list.
2. Fetch `/api/campaigns/:id` and `/api/escrows` on page load.
3. Add loading and empty-state handling.
4. Wire the donation CTA to `/api/donations` with a success banner.
5. Render explorer links using placeholder URL format.

Measurements of success:
- Page renders correctly with stub data within 2 seconds of load.
- Error states show when backend is offline.
- Donation action shows a clear success or failure message.

Inputs (min dependencies):
- API response shapes from backend (stable even in stub mode)
- Placeholder explorer URL format (Testnet)

Outputs (contracts to others):
- Working UI that can demo the glass-box flow with stub data
- Clear placeholders for real tx hashes once XRPL integration is ready

Acceptance:
- Campaign page renders data from `/api/campaigns/:id` and `/api/escrows`
- Donation button calls `/api/donations` and displays success/failure

Next step:
- Build the page using mocked API responses and a simple refresh that re-fetches `/api/campaigns/:id`.


Person 4: Verifier Dashboard + Demo Flow
Description: Own the verifier UI and demo script to approve escrow release, reflecting the “glass box” unlock step.

Responsibilities:
- Build verifier page listing pending escrows
- Add approve action wired to backend stub endpoint
- Provide demo flow checklist with expected UI transitions

Numbered steps:
1. Build a list view for pending escrows.
2. Add an approve/release button per escrow.
3. Call the backend approve endpoint and update UI state.
4. Add confirmation and error messaging.
5. Write a step-by-step demo checklist (what to click and expected state changes).

Measurements of success:
- Approving an escrow updates UI from pending to released.
- Demo can be run without XRPL integration using stub mode.
- Error messages are clear when approval fails.

Inputs (min dependencies):
- Backend endpoint to approve/release escrow
- Escrow list format from backend

Outputs (contracts to others):
- Verifier UI that can show pending → released state changes
- Demo script steps that align with the public campaign page

Acceptance:
- Approve endpoint triggers UI update from pending to released in stub mode
- Demo script is reproducible without XRPL integration

Next step:
- Create a simple verifier page that calls a stub approve endpoint and updates UI state from “pending” → “released.”
