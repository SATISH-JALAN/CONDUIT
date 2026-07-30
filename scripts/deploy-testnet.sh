#!/usr/bin/env bash
#
# Conduit — deploy the token-backed stream_router to Stellar testnet.
#
# What this does (all real, on-chain):
#   1. Ensures a funded operator identity exists.
#   2. Builds the stream_router contract to wasm.
#   3. Resolves the yield asset's SAC (Stellar Asset Contract) address.
#      On testnet we use native XLM's SAC as a stand-in for USDC — it needs no
#      trustlines or minting (friendbot funds every wallet), so deposits/harvests
#      move real tokens end-to-end. On mainnet, set YIELD_ASSET to the USDC SAC.
#   4. Deploys the contract and calls initialize(admin, token).
#   5. Seeds the vault reserve so harvest() can pay accrued yield.
#   6. Prints (and writes to .env.deploy) the env block the server needs.
#
# Prereqs: stellar CLI 23+ (`stellar --version`). Requires network access.
#
# Usage:
#   bash scripts/deploy-testnet.sh
#   IDENTITY=my-key RESERVE_XLM=250 bash scripts/deploy-testnet.sh
#
set -euo pipefail

# ── Config (override via env) ────────────────────────────────────────────────
NETWORK="${STELLAR_NETWORK:-testnet}"
IDENTITY="${IDENTITY:-conduit-operational}"
YIELD_ASSET="${YIELD_ASSET:-native}"        # `native` (XLM SAC) or CODE:ISSUER
RESERVE_XLM="${RESERVE_XLM:-100}"           # yield reserve seeded into the vault
PACKAGE="conduit-stream-router"
MANIFEST="contracts/Cargo.toml"
OUT_ENV=".env.deploy"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$1"; }
ok()  { printf '\033[1;32m✓ %s\033[0m\n' "$1"; }

command -v stellar >/dev/null 2>&1 || {
  echo "ERROR: stellar CLI not found. Install it: https://developers.stellar.org/docs/tools/cli" >&2
  exit 1
}

# Resolve explicit RPC + passphrase for contract calls. The CLI's named-network
# registry can be missing a passphrase, so we pass both explicitly for reliability.
if [ "$NETWORK" = "mainnet" ]; then
  RPC_URL="${SOROBAN_RPC_URL:-https://mainnet.sorobanrpc.com}"
  PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Public Global Stellar Network ; September 2015}"
else
  RPC_URL="${SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org}"
  PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
fi
NET=(--rpc-url "$RPC_URL" --network-passphrase "$PASSPHRASE")

# ── 1. Operator identity ─────────────────────────────────────────────────────
say "Ensuring operator identity '$IDENTITY' exists and is funded"
if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  stellar keys generate "$IDENTITY"
  ok "Generated new identity '$IDENTITY'"
fi
ADMIN="$(stellar keys address "$IDENTITY")"
# Fund via friendbot on non-mainnet (reliable; independent of CLI network registry).
if [ "$NETWORK" != "mainnet" ]; then
  curl -s "https://friendbot.stellar.org/?addr=${ADMIN}" >/dev/null 2>&1 || true
fi
echo "  admin/operator: $ADMIN"

# ── 2. Build contracts ───────────────────────────────────────────────────────
say "Building contracts to wasm"
stellar contract build --manifest-path "$MANIFEST"
WASM="contracts/target/wasm32v1-none/release/conduit_stream_router.wasm"
ORACLE_WASM="contracts/target/wasm32v1-none/release/conduit_rate_oracle.wasm"
[ -f "$WASM" ] || { echo "ERROR: wasm not found at $WASM" >&2; exit 1; }
[ -f "$ORACLE_WASM" ] || { echo "ERROR: wasm not found at $ORACLE_WASM" >&2; exit 1; }
ok "Built stream_router + rate_oracle wasm"

# ── 3. Resolve yield asset SAC ───────────────────────────────────────────────
say "Resolving yield asset SAC ($YIELD_ASSET)"
# Deploy the SAC if it does not exist yet; ignore "already exists".
stellar contract asset deploy --asset "$YIELD_ASSET" \
  --source "$IDENTITY" "${NET[@]}" >/dev/null 2>&1 || true
TOKEN_ID="$(stellar contract id asset --asset "$YIELD_ASSET" "${NET[@]}")"
ok "Yield asset SAC: $TOKEN_ID"

# ── 3b. Deploy + initialize rate oracle, seed box rates ──────────────────────
say "Deploying rate_oracle"
ORACLE_ID="$(stellar contract deploy --wasm "$ORACLE_WASM" \
  --source "$IDENTITY" "${NET[@]}")"
ok "Deployed rate_oracle: $ORACLE_ID"

stellar contract invoke --id "$ORACLE_ID" \
  --source "$IDENTITY" "${NET[@]}" -- \
  initialize --admin "$ADMIN"
ok "rate_oracle initialized"

say "Seeding box rates (bps) from the initial strategy set"
# box_id:apy_bps — Commit 5's keeper will take over live rate updates.
BOX_RATES=(
  "us-treasury-10y:420" "corporate-bond-a:650" "emerging-market-b:1200"
  "green-energy-fund:780" "tech-growth-bond:1550" "german-bund-2027:384"
  "ondo-usdy:510" "benji-franklin:450"
)
for entry in "${BOX_RATES[@]}"; do
  bid="${entry%%:*}"; bps="${entry##*:}"
  stellar contract invoke --id "$ORACLE_ID" \
    --source "$IDENTITY" "${NET[@]}" -- \
    set_rate --box_id "$bid" --apy_bps "$bps" >/dev/null
  echo "  $bid → ${bps}bps"
done
ok "Seeded ${#BOX_RATES[@]} box rates"

# ── 4. Deploy + initialize stream_router ─────────────────────────────────────
say "Deploying stream_router"
CONTRACT_ID="$(stellar contract deploy --wasm "$WASM" \
  --source "$IDENTITY" "${NET[@]}")"
ok "Deployed stream_router: $CONTRACT_ID"

say "Initializing vault (admin + yield asset + oracle)"
stellar contract invoke --id "$CONTRACT_ID" \
  --source "$IDENTITY" "${NET[@]}" -- \
  initialize --admin "$ADMIN" --token "$TOKEN_ID" --oracle "$ORACLE_ID"
ok "initialize(admin=$ADMIN, token=$TOKEN_ID, oracle=$ORACLE_ID)"

# ── 5. Seed the yield reserve ────────────────────────────────────────────────
# stroops = XLM * 10^7. Move reserve from the operator into the vault's token
# balance so harvest() can pay accrued yield.
RESERVE_STROOPS=$(( RESERVE_XLM * 10000000 ))
say "Seeding vault reserve with ${RESERVE_XLM} XLM ($RESERVE_STROOPS base units)"
stellar contract invoke --id "$TOKEN_ID" \
  --source "$IDENTITY" "${NET[@]}" -- \
  transfer --from "$ADMIN" --to "$CONTRACT_ID" --amount "$RESERVE_STROOPS"
ok "Reserve seeded"

# ── 6. Emit env block ────────────────────────────────────────────────────────
cat > "$OUT_ENV" <<EOF
# Generated by scripts/deploy-testnet.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Copy these into your server .env to activate real on-chain deposits/harvests.
SOROBAN_ENABLED=true
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STREAM_ROUTER_CONTRACT_ID=$CONTRACT_ID
RATE_ORACLE_CONTRACT_ID=$ORACLE_ID
YIELD_ASSET_ID=$TOKEN_ID
YIELD_ASSET_DECIMALS=7
STELLAR_OPERATIONAL_ADDRESS=$ADMIN
EOF

say "Done — deployment summary"
echo "  stream_router : $CONTRACT_ID"
echo "  rate_oracle   : $ORACLE_ID"
echo "  yield asset   : $TOKEN_ID ($YIELD_ASSET)"
echo "  operator      : $ADMIN"
echo "  reserve       : ${RESERVE_XLM} XLM"
echo "  explorer      : https://stellar.expert/explorer/$NETWORK/contract/$CONTRACT_ID"
echo ""
ok "Wrote env block to $OUT_ENV (gitignored). Merge it into your server .env."
