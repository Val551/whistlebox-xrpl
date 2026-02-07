# Whistlebox XRPL

Whistlebox is a “glass box” funding MVP for investigative journalism:
donors contribute pseudonymously, funds are locked with XRPL escrows, and released after verification.

## Tech
- Frontend: React (Vite)
- Backend: Node + Express
- XRPL: xrpl.js (Testnet)

## Setup

### Backend
```bash
cd backend
cp .env.example .env
npm i
npm run dev
