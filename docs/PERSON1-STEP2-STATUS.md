# Person 1 Step 2 Status

Date: 2026-02-07
Network: XRPL Testnet (`wss://s.altnet.rippletest.net:51233`)

## Goal
Build a minimal Node script that connects to XRPL via WebSocket using `xrpl.js`.

## Implementation
- Added `backend/scripts/xrpl-websocket-smoke.ts`
- Added npm commands in `backend/package.json`:
  - `npm run xrpl:step2` (run smoke script)
  - `npm run xrpl:step2:test` (run smoke script with assertions)

## Test Run
Ran:

```bash
cd backend
npm run xrpl:step2:test
```

Result snapshot:
- Connected in: `422ms`
- Network ID: `1`
- Build version: `3.1.0-rc2`
- Validated ledger: `14689890`
- Open ledger fee: `10 drops`

Step 2 is complete and verified: the script connects to XRPL over WebSocket and validates live ledger metadata.
