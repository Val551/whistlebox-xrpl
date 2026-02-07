# Whistlebox XRPL

Glass-box funding for investigative journalism using XRPL escrows.

## What You Need
- Node.js 18+ (npm included)
- XRPL Testnet/Devnet wallets for demo (custody, journalist, verifier)

## Repo Structure
- `backend/` Express API + XRPL integration (stub mode supported)
- `frontend/` Vite + React UI
- `shared/` JSON contracts for data shapes

## Environment Setup
1. Backend
   1. Copy `backend/.env.example` to `backend/.env`
   2. Fill in wallet seeds and addresses as needed
2. Frontend
   1. Copy `frontend/.env.example` to `frontend/.env`
   2. Update `VITE_API_BASE` if your backend runs elsewhere

## Install Dependencies
1. Backend
   ```bash
   cd backend
   npm install
   ```
2. Frontend
   ```bash
   cd frontend
   npm install
   ```

## Run Locally
1. Backend (API at `http://localhost:3001`)
   ```bash
   cd backend
   npm run dev
   ```
2. Frontend (UI at `http://localhost:5173`)
   ```bash
   cd frontend
   npm run dev
   ```

## Demo Flow (Stub Mode)
Stub mode is controlled by `STUB_MODE=true` in `backend/.env`.
1. Open the frontend in your browser.
2. Create a donation (creates a stub escrow).
3. Click "Verify & Release" to simulate escrow finish.

## Key API Endpoints
- `GET /api/health`
- `GET /api/campaigns/:id`
- `POST /api/donations`
- `GET /api/escrows`
- `POST /api/escrows/:id/release`

## Shared Contract
See `shared/contract.json` for the `Campaign`, `Escrow`, and `Donation` shapes.
