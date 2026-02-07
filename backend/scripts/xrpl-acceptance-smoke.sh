#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3001}"
CAMPAIGN_ID="${CAMPAIGN_ID:-cityhall-001}"
MODE="${1:-real}"

echo "XRPL acceptance smoke"
echo "API_BASE=$API_BASE"
echo "CAMPAIGN_ID=$CAMPAIGN_ID"
echo "MODE=$MODE"
echo

health_json="$(curl -s "$API_BASE/api/health")"
echo "[health] $health_json"

if [[ "$MODE" == "stub" ]]; then
  if ! echo "$health_json" | grep -q '"mode":"stub"'; then
    echo "Expected stub mode but backend is not in stub mode."
    exit 1
  fi
else
  if ! echo "$health_json" | grep -q '"mode":"real-xrpl"'; then
    echo "Expected real-xrpl mode but backend is not in real mode."
    exit 1
  fi
fi

echo
echo "[campaign]"
curl -s "$API_BASE/api/campaigns/$CAMPAIGN_ID"
echo

echo
echo "[escrows]"
escrows_json="$(curl -s "$API_BASE/api/escrows")"
echo "$escrows_json"

if [[ "$MODE" == "real" ]]; then
  if ! echo "$escrows_json" | grep -Eq '"escrowCreateTx":"[A-F0-9]{64}"'; then
    echo "Warning: did not find any real 64-char EscrowCreate hash in /api/escrows output."
  fi
fi

echo
echo "Smoke check completed."

