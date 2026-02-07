Low-dependency integration rules (so nobody blocks)
Define a shared JSON contract now: Campaign, Escrow, Donation shapes (even if mocked).


Everything should work with mock data first: Frontend and verifier can build fully before XRPL is done.


Backend supports “stub mode”: return sample escrows until XRPL watcher is ready.


One shared “Campaign ID”: hardcode cityhall-001 for the hack to keep it simple.





Repo setup and installs
Node.js (v18+) for backend scripts and server. Must have


Package manager (npm). Must have


XRPL JS SDK: xrpl (xrpl.js) for payments + escrows. Must have


Backend framework (express) + basics (cors, dotenv). Must have


Frontend framework (React via Vite or Next.js). Must have


TypeScript (recommended for speed + fewer bugs). Optional



XRPL network resources
XRPL Testnet or Devnet faucet to fund wallets with test XRP. Must have


Public XRPL WebSocket server endpoint (so you can submit txs and subscribe to payments). Must have


XRPL Testnet explorer to show tx links during demo. Must have



Key XRPL references to bookmark
EscrowCreate (how you lock funds in the “glass box”). Must have


EscrowFinish (how you release funds after verification). Must have


Escrow ledger entry (how you list escrows for transparency). Must have


Monitoring incoming payments via WebSocket (how backend detects donations). Must have


Conditional escrow tutorial (only if you add “publish-to-unlock” secret). Optional



Accounts and “people” (roles) you need
Campaign wallet (Custody wallet): receives donations and creates escrows. Must have


Journalist wallet: escrow destination. Must have


Verifier wallet: used to trigger releases (editor/watchdog role). Must have


Team roles:


1 person owning XRPL tx code (payment, escrow create/finish)


1 person owning backend APIs + persistence


1 person owning public campaign UI


1 person owning verifier UI + demo script
 Must have



Storage and operations
Simple persistence: JSON file or SQLite to store campaigns + offerSequence for escrows. Must have


Logging + error handling for failed txs and retries. Must have


Secrets handling: .env for wallet seeds, never in frontend. Must have



Nice-to-have tools
ESLint + Prettier for faster collaboration. Optional


Docker (only if your team prefers consistent envs). Optional


Hosted demo (Vercel for frontend, Render/Fly.io for backend). Optional


Multisig release (true on-ledger “verifier must co-sign”). Optional (cool, but not required for MVP)
