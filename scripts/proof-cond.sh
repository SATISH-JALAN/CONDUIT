#!/usr/bin/env bash
#
# Conduit — prove bounded, auditable on-chain COND execution.
#
# A user opens a position and sets an on-chain mandate + kill switch. The
# operator (agent) then tries to reprice the position:
#   A. within mandate, kill off  → succeeds (CoT event, position repriced)
#   B. kill switch engaged        → reverts (KillSwitchEngaged)
#   C. rate outside mandate       → reverts (MandateViolation)
#
# Reads STREAM_ROUTER_CONTRACT_ID + COND_EXECUTOR_CONTRACT_ID from .env.deploy.
#
# Usage: bash scripts/proof-cond.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NETWORK="${STELLAR_NETWORK:-testnet}"
DEPOSIT_XLM="${DEPOSIT_XLM:-50}"
DEPOSIT_BOX="${DEPOSIT_BOX:-us-treasury-10y}"   # ~420 bps at deploy
EXEC_BOX="${EXEC_BOX:-ondo-usdy}"               # ~510 bps at deploy
IDENTITY="${IDENTITY:-conduit-operational}"

if [ -f .env.deploy ]; then
  set -a; source <(grep -E '^(STREAM_ROUTER_CONTRACT_ID|COND_EXECUTOR_CONTRACT_ID)=' .env.deploy); set +a
fi
: "${STREAM_ROUTER_CONTRACT_ID:?run deploy-testnet.sh first}"
: "${COND_EXECUTOR_CONTRACT_ID:?run deploy-testnet.sh first}"
ROUTER="$STREAM_ROUTER_CONTRACT_ID"
COND="$COND_EXECUTOR_CONTRACT_ID"
DEPOSIT_STROOPS=$(( DEPOSIT_XLM * 10000000 ))

RPC_URL="${SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org}"
PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
NET=(--rpc-url "$RPC_URL" --network-passphrase "$PASSPHRASE")

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$1"; }

USER_ID="cond-user-$(date +%s)"
say "Creating funded user wallet"
stellar keys generate "$USER_ID" >/dev/null 2>&1 || true
USER_ADDR="$(stellar keys address "$USER_ID")"
curl -s "https://friendbot.stellar.org/?addr=${USER_ADDR}" >/dev/null || true
sleep 5
echo "  user: $USER_ADDR"

say "User deposits into '$DEPOSIT_BOX' (opens a position)"
stellar contract invoke --id "$ROUTER" --source "$USER_ID" "${NET[@]}" -- \
  deposit --wallet "$USER_ADDR" --amount "$DEPOSIT_STROOPS" --box_id "$DEPOSIT_BOX" >/dev/null
echo "  anchor apy before: $(stellar contract invoke --id "$ROUTER" --source "$IDENTITY" "${NET[@]}" \
  --send=no -- get_anchor --wallet "$USER_ADDR" | grep -o '"apy_bps":[0-9]*')"

say "User sets on-chain mandate [100, 1000] bps (kill off)"
stellar contract invoke --id "$COND" --source "$USER_ID" "${NET[@]}" -- \
  set_mandate --wallet "$USER_ADDR" --min_apy_bps 100 --max_apy_bps 1000 >/dev/null

say "A. Operator executes reprice to '$EXEC_BOX' — within mandate → should SUCCEED"
stellar contract invoke --id "$COND" --source "$IDENTITY" "${NET[@]}" -- \
  execute_action --wallet "$USER_ADDR" --box_id "$EXEC_BOX" \
  --reason "rotate into higher-grade box" --confidence 88
echo "  anchor apy after : $(stellar contract invoke --id "$ROUTER" --source "$IDENTITY" "${NET[@]}" \
  --send=no -- get_anchor --wallet "$USER_ADDR" | grep -o '"apy_bps":[0-9]*')  (repriced on-chain)"

say "B. User engages kill switch; operator execute → should REVERT"
stellar contract invoke --id "$COND" --source "$USER_ID" "${NET[@]}" -- \
  set_kill_switch --wallet "$USER_ADDR" --engaged true >/dev/null
if stellar contract invoke --id "$COND" --source "$IDENTITY" "${NET[@]}" -- \
    execute_action --wallet "$USER_ADDR" --box_id "$EXEC_BOX" --reason "blocked" --confidence 50 >/dev/null 2>&1; then
  echo "  ✗ UNEXPECTED: execution succeeded despite kill switch"; exit 1
else
  echo "  ✓ correctly reverted (kill switch engaged)"
fi

say "C. Kill off, tighten mandate to [100, 300]; ${EXEC_BOX} (~510) is out of bounds → should REVERT"
stellar contract invoke --id "$COND" --source "$USER_ID" "${NET[@]}" -- \
  set_kill_switch --wallet "$USER_ADDR" --engaged false >/dev/null
stellar contract invoke --id "$COND" --source "$USER_ID" "${NET[@]}" -- \
  set_mandate --wallet "$USER_ADDR" --min_apy_bps 100 --max_apy_bps 300 >/dev/null
if stellar contract invoke --id "$COND" --source "$IDENTITY" "${NET[@]}" -- \
    execute_action --wallet "$USER_ADDR" --box_id "$EXEC_BOX" --reason "too risky" --confidence 60 >/dev/null 2>&1; then
  echo "  ✗ UNEXPECTED: execution succeeded outside mandate"; exit 1
else
  echo "  ✓ correctly reverted (mandate violation)"
fi

say "Proof complete ✓  agent actions are bounded on-chain by the user's mandate."
echo "  cond_executor: https://stellar.expert/explorer/$NETWORK/contract/$COND"
