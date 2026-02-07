# Multi-Campaign Real Data Implementation Runbook

## Overview
This document walks through the complete process of transitioning from dummy stub data to real XRPL testnet data with multi-campaign support.

## What Was Built

### Backend Changes
1. **New Script: `xrpl-verifier-wallet-bootstrap.ts`**
   - Creates or reuses a verifier wallet on XRPL testnet
   - Funds it with test XRP from the faucet
   - Outputs wallet seed and address to console for .env configuration

2. **New Migration Script: `migrations.ts`**
   - Reads environment variables (wallet addresses, XRPL transaction hashes)
   - Creates 3 sample campaigns in SQLite database
   - Creates 3 test escrows per campaign (9 total)
   - Each escrow is valued at 1 XRP
   - Supports real transaction hashes from testnet

3. **Enhanced Database Support**
   - Added `createCampaign()` function to `dbStore.ts`
   - Added `listCampaigns()` function to `dbStore.ts`
   - Both use SQLite for persistence

4. **New API Endpoint**
   - `GET /api/campaigns` - Lists all campaigns
   - `POST /api/campaigns` - Creates new campaign (database mode only)
   - Existing `GET /api/campaigns/:id` - Gets single campaign

5. **Cleaned Stub Data**
   - `stub.ts` escrows array is now empty
   - `stub.ts` donations array is now empty
   - This prevents dummy data from interfering

6. **New npm Scripts**
   ```bash
   npm run xrpl:verifier:setup      # Create/fund verifier wallet
   npm run migrate:testdata         # Load real data to SQLite
   ```

### Frontend Changes
1. **Campaign Selector UI**
   - Dropdown added to both App.tsx (donor view) and Verifier.tsx
   - Dynamically fetches list of campaigns from backend
   - Escrows are filtered by selected campaign
   - Selection is reactive (changes update data immediately)

2. **Multi-Campaign Data Filtering**
   - Escrows are now filtered to show only those for selected campaign
   - Campaign totals (raised, locked, released) reflect selected campaign

## Step-by-Step Execution

### Phase 1: Create Real XRPL Testnet Data

#### Step 1a: Fund Test Wallets
```bash
cd backend
npm run xrpl:step1
```

**Output:** You'll see 3 wallets created and funded:
- Custody wallet (holds funds to create escrows)
- Journalist wallet (receives released funds)
- Verifier wallet (approves/releases escrows) - **IF NOT ALREADY CREATED**

**Action Required:** Copy the generated wallet seeds/addresses and add to `.env`:
```
CUSTODY_WALLET_SEED=sEd...
CUSTODY_WALLET_ADDRESS=r...
JOURNALIST_WALLET_ADDRESS=r...
JOURNALIST_WALLET_SEED=sEd... (if generated)
VERIFIER_WALLET_SEED=sEd... (if generated)
VERIFIER_WALLET_ADDRESS=r...
```

---

#### Step 1b: Create Verifier Wallet (if not done in 1a)
```bash
npm run xrpl:verifier:setup
```

**Output:** Verifier wallet details
```
VERIFIER_WALLET_SEED=sEd...
VERIFIER_WALLET_ADDRESS=r...
```

**Action:** Add to `.env` if not already present

---

#### Step 1c: Create Real Escrows
```bash
npm run xrpl:step3
```

**Output:** Shows the first escrow creation:
```
Step 3 complete: XRPL EscrowCreate submission
sourceAddress: rCUSTODYADDRESS...
destinationAddress: rJOURNALISTADDRESS...
amountdropx: 1000000 (1 XRP)
txHash: A1B2C3D4E5F6... (64-char hex)
offerSequence: 12345
ledgerIndex: 12345678
```

**Action Required:** Copy these values to `.env`:
```
XRPL_ESCROW_CREATE_TX_HASH=A1B2C3D4E5F6...
XRPL_ESCROW_OWNER_ADDRESS=rCUSTODYADDRESS...
XRPL_ESCROW_OFFER_SEQUENCE=12345
```

**Note:** This escrow will be created for campaign `cityhall-001`

---

### Phase 2: Migrate Data to SQLite

```bash
npm run migrate:testdata
```

**Output:** Shows all created campaigns and escrows:
```
Migrating test data to SQLite from .env variables...

✓ Created campaign: cityhall-001
✓ Created campaign: school-board-001
✓ Created campaign: environmental-001

Creating test escrows...
  ✓ Created escrow: escrow-0001 (1 XRP)    [uses XRPL_ESCROW_CREATE_TX_HASH]
  ✓ Created escrow: escrow-0002 (1 XRP)    [local test data]
  ✓ Created escrow: escrow-0003 (1 XRP)    [local test data]
  ✓ Created escrow: escrow-0004 (1 XRP)    [school-board-001]
  ✓ Created escrow: escrow-0005 (1 XRP)    [school-board-001]
  ✓ Created escrow: escrow-0006 (1 XRP)    [school-board-001]
  ✓ Created escrow: escrow-0007 (1 XRP)    [environmental-001]
  ✓ Created escrow: escrow-0008 (1 XRP)    [environmental-001]
  ✓ Created escrow: escrow-0009 (1 XRP)    [environmental-001]

✓ Migration complete!

Next steps:
1. Set STUB_MODE=false in backend/.env
2. Run: npm run dev
3. Navigate to http://localhost:5173 to select a campaign
```

---

### Phase 3: Switch to Database Mode

Edit `backend/.env` and change:
```diff
- STUB_MODE=true
+ STUB_MODE=false
```

---

### Phase 4: Test the System

#### Terminal 1: Start Backend
```bash
cd backend
npm run dev
```
Output should show:
```
Server is running at http://localhost:3001
```

#### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```
Output should show:
```
VITE v... ready in ... ms

➜  Local:   http://localhost:5173/
```

#### Test in Browser
1. **Navigate to**: http://localhost:5173
2. **Campaign Selector**: You should see a dropdown with:
   - City Hall Contracts Investigation
   - School Board Corruption Investigation
   - Environmental Violations Investigation
3. **Campaign Data**: 
   - Totals should show 3 XRP raised (from 3 escrows × 1 XRP each)
   - 3 XRP locked in escrow
   - 0 XRP released (until verifier approves)
4. **Switch Campaigns**: Select different campaigns and verify escrows change
5. **Verifier View**: Click "Verifier Dashboard" button and test:
   - Campaign selector works
   - Shows 3 pending escrows for selected campaign
   - Can release escrows (requires VERIFIER_API_TOKEN and VERIFIER_WALLET_SEED)

---

## Data Structure

### Campaigns (3 total)
```
cityhall-001
├─ title: City Hall Contracts Investigation
├─ journalistAddress: rJOURNALIST... (from JOURNALIST_WALLET_ADDRESS)
├─ verifierAddress: rVERIFIER... (from VERIFIER_WALLET_ADDRESS)
└─ escrows: escrow-0001, escrow-0002, escrow-0003

school-board-001
├─ title: School Board Corruption Investigation
├─ journalistAddress: rJOURNALIST...
├─ verifierAddress: rVERIFIER...
└─ escrows: escrow-0004, escrow-0005, escrow-0006

environmental-001
├─ title: Environmental Violations Investigation
├─ journalistAddress: rJOURNALIST...
├─ verifierAddress: rVERIFIER...
└─ escrows: escrow-0007, escrow-0008, escrow-0009
```

### Escrows (9 total)
| ID | Campaign | Amount | Status | TX Hash |
|---|---|---|---|---|
| escrow-0001 | cityhall-001 | 1 XRP | locked | Real (from testnet) |
| escrow-0002 | cityhall-001 | 1 XRP | locked | Local test |
| escrow-0003 | cityhall-001 | 1 XRP | locked | Local test |
| escrow-0004 | school-board-001 | 1 XRP | locked | Local test |
| escrow-0005 | school-board-001 | 1 XRP | locked | Local test |
| escrow-0006 | school-board-001 | 1 XRP | locked | Local test |
| escrow-0007 | environmental-001 | 1 XRP | locked | Local test |
| escrow-0008 | environmental-001 | 1 XRP | locked | Local test |
| escrow-0009 | environmental-001 | 1 XRP | locked | Local test |

---

## Database Location
SQLite database file: `backend/data/whistlebox.sqlite`

To inspect:
```bash
sqlite3 backend/data/whistlebox.sqlite

# View campaigns
SELECT id, title, totalRaisedXrp, totalLockedXrp FROM campaigns;

# View escrows
SELECT id, campaignId, amountXrp, status, escrowCreateTx FROM escrows;

# View donations
SELECT id, campaignId, amountXrp, paymentTx, status FROM donations;

.quit
```

---

## Cleanup (Manual - When Ready)

Once you've tested and before final deployment, you can delete the stub data that was cleared:

The following files have empty arrays but can be completely removed if you want:
- `backend/src/data/stub.ts` - Can be deleted entirely (no longer needed)
- `backend/src/data/stubStore.ts` - Can be deleted if STUB_MODE will never be true again

Set `STUB_MODE=false` permanently in production `.env` to ensure stub mode is never used.

---

## Troubleshooting

### Issue: "Campaign not found" errors
**Cause:** Escrows exist but campaigns don't
**Fix:** Run `npm run migrate:testdata` again

### Issue: No campaigns appear in dropdown
**Cause:** Backend not running or migration not executed
**Fix:** 
1. Check backend is running on port 3001
2. Run `npm run migrate:testdata`
3. Refresh browser

### Issue: Escrows don't appear for selected campaign
**Cause:** Escrows are in database but filtered by campaign
**Fix:** Verify CAMPAIGN_ID matches one of the created campaigns
- cityhall-001
- school-board-001
- environmental-001

### Issue: Real escrow (escrow-0001) shows but fake ones don't
**Cause:** XRPL_ESCROW_CREATE_TX_HASH was not set properly
**Fix:** Verify TX hash is exactly 64 hex characters and set in .env before running migration

---

## Next Steps for Future Development

### Adding More Campaigns
```typescript
// Add to migrations.ts campaigns array:
{
  id: "campaign-name",
  title: "Display Title",
  description: "...",
  journalistAddress: journalistWalletAddress,
  verifierAddress: verifierWalletAddress,
  goalXrp: 100,
}
```

### Running Against Real Donations
Currently all test escrows are in "locked" state. To test the release flow:
1. Create a real escrow on testnet
2. Add TX hash to migrations
3. Use verifier dashboard to release it
4. Check XRPL explorer for the EscrowFinish transaction

### Frontend Campaign Management
The current implementation loads campaigns from backend. To allow creating campaigns from UI:
1. Add POST `/api/campaigns` form in frontend
2. Handle the creation response
3. Update campaign selector dropdown

---

## Files Changed
```
backend/
  scripts/
    ✓ xrpl-verifier-wallet-bootstrap.ts (NEW)
  src/
    data/
      ✓ migrations.ts (NEW)
      ✓ dbStore.ts (added createCampaign, listCampaigns)
      ✓ stub.ts (cleared escrows/donations arrays)
    routes/
      ✓ campaigns.ts (added GET /, POST /)
  ✓ package.json (added npm scripts)
  ✓ .env.example (updated)

frontend/
  src/
    ✓ App.tsx (added campaign selector)
    ✓ Verifier.tsx (added campaign selector)
```

---

## Verification Checklist

- [ ] Run `npm run xrpl:step1` and copy wallet details to .env
- [ ] Run `npm run xrpl:step3` and copy escrow details to .env
- [ ] Run `npm run migrate:testdata` and see 9 escrows created
- [ ] Set `STUB_MODE=false` in .env
- [ ] Run backend with `npm run dev`
- [ ] Run frontend with `npm run dev`
- [ ] Launch http://localhost:5173
- [ ] Campaign dropdown shows 3 campaigns
- [ ] Switching campaigns updates data
- [ ] Each campaign shows correct escrow counts (3 each)
- [ ] Verifier dashboard works and shows correct campaign escrows
- [ ] Database file exists at `backend/data/whistlebox.sqlite`
