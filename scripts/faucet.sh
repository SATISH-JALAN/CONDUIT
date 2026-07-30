#!/usr/bin/env bash
#
# Conduit — fund a testnet wallet with the yield asset.
#
# On testnet the yield asset is native XLM (see deploy-testnet.sh), so funding a
# wallet is simply a friendbot grant — no minting or trustlines required.
#
# Usage:
#   bash scripts/faucet.sh GXXXX...            # fund an existing address
#   bash scripts/faucet.sh                     # generate + fund a fresh identity
#
set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"
ADDR="${1:-}"

if [ -z "$ADDR" ]; then
  ID="conduit-test-$(date +%s)"
  echo "No address given — generating identity '$ID'"
  stellar keys generate "$ID"
  ADDR="$(stellar keys address "$ID")"
  echo "  identity: $ID"
fi

echo "Funding $ADDR via friendbot ($NETWORK)..."
curl -s "https://friendbot.stellar.org/?addr=${ADDR}" >/dev/null && \
  echo "✓ Funded $ADDR" || echo "friendbot request completed (may already be funded)"
