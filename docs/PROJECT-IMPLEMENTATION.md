Person 1: XRPL Core Transactions
Description: Implement XRPL wallet setup and the 3 core actions: detect donation payment, create escrow, finish escrow.


Needed to start: Testnet WebSocket URL, xrpl.js, 2 to 3 funded test wallets (campaign, journalist, verifier), and a shared “campaignId” format.


Blocks: Confusion around Escrow identifiers (Owner + OfferSequence), time locks, sequence numbers, and flaky Testnet connections.


Next step: Write a tiny Node script that connects to Testnet and submits one EscrowCreate, then one EscrowFinish, and logs tx hashes.



Person 2: Backend API + Storage
Description: Build the Express backend and persistence for campaigns, donations, and escrows, plus API routes the frontend will call.


Needed to start: Agreed JSON schema (campaign, donation, escrow), and endpoints list (example: /campaign/:id, /escrows, /approve).


Blocks: Keeping state consistent if the server restarts, handling duplicate donation events, and rate limits/timeouts.


Next step: Create Express skeleton with a local JSON or SQLite store and stub routes returning hardcoded sample data.



Person 3: Public Campaign Frontend
Description: Build the public UI: campaign page showing goal, total raised, total locked, escrow list, donation instructions, and explorer links.


Needed to start: API contract from backend (response shapes), basic copy text, and a placeholder explorer URL format for tx hashes.


Blocks: UI waiting on real backend data, dealing with loading states, and formatting XRP vs drops cleanly.


Next step: Build the page using mocked API responses and a simple “refresh” button that re-fetches /campaign/:id.



Person 4: Verifier Dashboard + Demo Flow
Description: Build the verifier UI and demo script: list pending escrows, input proof link, click “Approve” to trigger release, show status updates.


Needed to start: Backend endpoint to approve (POST /campaign/:id/escrows/:offerSequence/approve) and the escrow list format.


Blocks: Escrow finish failing due to timing/sequence issues, unclear error messaging, and keeping UI status in sync.


Next step: Create a simple verifier page that calls a stub “approve” endpoint and updates UI state from “pending” → “released.”
