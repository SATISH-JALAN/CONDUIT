#!/usr/bin/env bash
#
# Conduit — end-to-end on-chain proof against the deployed stream_router.
#
# Proves the protocol is REAL (not simulated): a deposit moves tokens into the
# vault, the anchor is stored on-chain, yield accrues, and harvest pays tokens
# back out. Prints balances before/after and Stellar Expert links.
#
# Reads STREAM_ROUTER_CONTRACT_ID + YIELD_ASSET_ID from .env.deploy (produced by
# scripts/deploy-testnet.sh) unless they are already set in the environment.
#
# Usage:
#   bash scripts/proof-e2e.sh
#   DEPOSIT_XLM=50 APY_BPS=700 bash scripts/proof-e2e.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NETWORK="${STELLAR_NETWORK:-testnet}"
DEPOSIT_XLM="${DEPOSIT_XLM:-25}"
APY_BPS="${APY_BPS:-500}"
ACCRUE_WAIT="${ACCRUE_WAIT:-20}"   # seconds to let yield accrue before harvest

# Load deployment output if present.
if [ -f .env.deploy ]; then
  # shellcheck disable=SC1091
  set -a; source <(grep -E '^(STREAM_ROUTER_CONTRACT_ID|YIELD_ASSET_ID)=' .env.deploy); set +a
fi

: "${STREAM_ROUTER_CONTRACT_ID:?Set STREAM_ROUTER_CONTRACT_ID or run deploy-testnet.sh first}"
: "${YIELD_ASSET_ID:?Set YIELD_ASSET_ID or run deploy-testnet.sh first}"

CONTRACT="$STREAM_ROUTER_CONTRACT_ID"
TOKEN="$YIELD_ASSET_ID"
DEPOSIT_STROOPS=$(( DEPOSIT_XLM * 10000000 ))

# Explicit RPC + passphrase for contract calls (named-network registry may lack
# a passphrase entry).
if [ "$NETWORK" = "mainnet" ]; then
  RPC_URL="${SOROBAN_RPC_URL:-https://mainnet.sorobanrpc.com}"
  PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Public Global Stellar Network ; September 2015}"
else
  RPC_URL="${SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org}"
  PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
fi
NET=(--rpc-url "$RPC_URL" --network-passphrase "$PASSPHRASE")

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$1"; }

balance() { # $1 = address
  stellar contract invoke --id "$TOKEN" --source "$USER_ID" "${NET[@]}" \
    --send=no -- balance --id "$1" 2>/dev/null | tr -d '"'
}

# ── Fresh, funded test wallet ────────────────────────────────────────────────
USER_ID="conduit-proof-$(date +%s)"
say "Creating funded test wallet '$USER_ID'"
stellar keys generate "$USER_ID"
USER_ADDR="$(stellar keys address "$USER_ID")"
echo "  wallet: $USER_ADDR"
# Fund via friendbot (reliable; does not depend on the CLI network registry).
curl -s "https://friendbot.stellar.org/?addr=${USER_ADDR}" >/dev/null || true
sleep 5

echo "  user balance before : $(balance "$USER_ADDR") base units"
echo "  vault balance before: $(balance "$CONTRACT") base units"

# ── Deposit (moves real tokens into the vault) ───────────────────────────────
say "deposit($DEPOSIT_XLM XLM @ ${APY_BPS}bps) — tokens move user → vault"
stellar contract invoke --id "$CONTRACT" --source "$USER_ID" "${NET[@]}" -- \
  deposit --wallet "$USER_ADDR" --amount "$DEPOSIT_STROOPS" --apy_bps "$APY_BPS"

echo "  user balance after deposit : $(balance "$USER_ADDR") base units"
echo "  vault balance after deposit: $(balance "$CONTRACT") base units"

say "Stored on-chain anchor"
stellar contract invoke --id "$CONTRACT" --source "$USER_ID" "${NET[@]}" \
  --send=no -- get_anchor --wallet "$USER_ADDR"

# ── Let yield accrue, then harvest ───────────────────────────────────────────
say "Waiting ${ACCRUE_WAIT}s for yield to accrue…"
sleep "$ACCRUE_WAIT"
echo "  accrued (get_accrued): $(stellar contract invoke --id "$CONTRACT" \
  --source "$USER_ID" "${NET[@]}" --send=no -- \
  get_accrued --wallet "$USER_ADDR") base units"

say "harvest() — vault pays accrued yield back to the user"
stellar contract invoke --id "$CONTRACT" --source "$USER_ID" "${NET[@]}" -- \
  harvest --wallet "$USER_ADDR"

echo "  user balance after harvest : $(balance "$USER_ADDR") base units"
echo "  vault balance after harvest: $(balance "$CONTRACT") base units"

say "Proof complete ✓  Real tokens moved on-chain."
echo "  contract: https://stellar.expert/explorer/$NETWORK/contract/$CONTRACT"
echo "  wallet  : https://stellar.expert/explorer/$NETWORK/account/$USER_ADDR"
