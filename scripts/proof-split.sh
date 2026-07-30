#!/usr/bin/env bash
#
# Conduit — prove trustless on-chain yield splitting.
#
# Sets a 70/30 split on a wallet, deposits, lets yield accrue, then harvests and
# shows the accrued yield landing at the two destinations in one atomic tx —
# routed inside the contract, not by the server.
#
# Reads STREAM_ROUTER_CONTRACT_ID + YIELD_ASSET_ID from .env.deploy.
#
# Usage: bash scripts/proof-split.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NETWORK="${STELLAR_NETWORK:-testnet}"
DEPOSIT_XLM="${DEPOSIT_XLM:-100}"
BOX_ID="${BOX_ID:-us-treasury-10y}"
ACCRUE_WAIT="${ACCRUE_WAIT:-25}"

if [ -f .env.deploy ]; then
  set -a; source <(grep -E '^(STREAM_ROUTER_CONTRACT_ID|YIELD_ASSET_ID)=' .env.deploy); set +a
fi
: "${STREAM_ROUTER_CONTRACT_ID:?run deploy-testnet.sh first}"
: "${YIELD_ASSET_ID:?run deploy-testnet.sh first}"
CONTRACT="$STREAM_ROUTER_CONTRACT_ID"
TOKEN="$YIELD_ASSET_ID"
DEPOSIT_STROOPS=$(( DEPOSIT_XLM * 10000000 ))

RPC_URL="${SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org}"
PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
NET=(--rpc-url "$RPC_URL" --network-passphrase "$PASSPHRASE")

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$1"; }

new_wallet() { # $1 = alias
  stellar keys generate "$1" >/dev/null 2>&1 || true
  local a; a="$(stellar keys address "$1")"
  curl -s "https://friendbot.stellar.org/?addr=${a}" >/dev/null || true
  echo "$a"
}

balance() { # $1 = address
  stellar contract invoke --id "$TOKEN" --source "$USER_ID" "${NET[@]}" \
    --send=no -- balance --id "$1" 2>/dev/null | tr -d '"'
}

ts=$(date +%s)
USER_ID="split-user-$ts"; D0_ID="split-d0-$ts"; D1_ID="split-d1-$ts"
say "Creating funded wallets (user + 2 split destinations)"
USER_ADDR="$(new_wallet "$USER_ID")"
D0="$(new_wallet "$D0_ID")"
D1="$(new_wallet "$D1_ID")"
sleep 5
echo "  user: $USER_ADDR"
echo "  dest0 (70%): $D0"
echo "  dest1 (30%): $D1"

say "set_split — route harvest 70/30 across two destinations (on-chain)"
stellar contract invoke --id "$CONTRACT" --source "$USER_ID" "${NET[@]}" -- \
  set_split --wallet "$USER_ADDR" \
  --splits "[{\"dest\":\"$D0\",\"bps\":7000},{\"dest\":\"$D1\",\"bps\":3000}]"

say "deposit($DEPOSIT_XLM XLM into '$BOX_ID')"
stellar contract invoke --id "$CONTRACT" --source "$USER_ID" "${NET[@]}" -- \
  deposit --wallet "$USER_ADDR" --amount "$DEPOSIT_STROOPS" --box_id "$BOX_ID" >/dev/null

D0_BEFORE="$(balance "$D0")"; D1_BEFORE="$(balance "$D1")"
echo "  dest0 before: $D0_BEFORE   dest1 before: $D1_BEFORE"

say "Waiting ${ACCRUE_WAIT}s for yield to accrue…"
sleep "$ACCRUE_WAIT"

say "harvest — contract routes accrued yield 70/30 atomically"
stellar contract invoke --id "$CONTRACT" --source "$USER_ID" "${NET[@]}" -- \
  harvest --wallet "$USER_ADDR"

D0_AFTER="$(balance "$D0")"; D1_AFTER="$(balance "$D1")"
echo "  dest0 after: $D0_AFTER  (received $(( D0_AFTER - D0_BEFORE )))"
echo "  dest1 after: $D1_AFTER  (received $(( D1_AFTER - D1_BEFORE )))"

say "Proof complete ✓  yield split routed on-chain in one harvest tx."
echo "  contract: https://stellar.expert/explorer/$NETWORK/contract/$CONTRACT"
