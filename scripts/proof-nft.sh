#!/usr/bin/env bash
#
# Conduit — prove real tokenized yield NFTs.
#
# Accredits a minter, mints a yield NFT (locking principal), transfers it to a
# second holder, then after maturity the holder redeems it for principal + the
# term's yield — all on-chain token movements.
#
# Reads YIELD_NFT_CONTRACT_ID + YIELD_ASSET_ID from .env.deploy.
#
# Usage: bash scripts/proof-nft.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NETWORK="${STELLAR_NETWORK:-testnet}"
PRINCIPAL_XLM="${PRINCIPAL_XLM:-100}"
BOX_ID="${BOX_ID:-us-treasury-10y}"
TERM_SECONDS="${TERM_SECONDS:-12}"
IDENTITY="${IDENTITY:-conduit-operational}"

if [ -f .env.deploy ]; then
  set -a; source <(grep -E '^(YIELD_NFT_CONTRACT_ID|YIELD_ASSET_ID)=' .env.deploy); set +a
fi
: "${YIELD_NFT_CONTRACT_ID:?run deploy-testnet.sh first}"
: "${YIELD_ASSET_ID:?run deploy-testnet.sh first}"
NFT="$YIELD_NFT_CONTRACT_ID"
TOKEN="$YIELD_ASSET_ID"
PRINCIPAL_STROOPS=$(( PRINCIPAL_XLM * 10000000 ))

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
  stellar contract invoke --id "$TOKEN" --source "$IDENTITY" "${NET[@]}" \
    --send=no -- balance --id "$1" 2>/dev/null | tr -d '"'
}

ts=$(date +%s)
MINTER_ID="nft-minter-$ts"; HOLDER_ID="nft-holder-$ts"
say "Creating funded wallets (minter + holder)"
MINTER="$(new_wallet "$MINTER_ID")"
HOLDER="$(new_wallet "$HOLDER_ID")"
sleep 5
echo "  minter: $MINTER"
echo "  holder: $HOLDER"

say "Accrediting the minter (operator/admin only)"
stellar contract invoke --id "$NFT" --source "$IDENTITY" "${NET[@]}" -- \
  set_accredited --wallet "$MINTER" --status true

MINTER_BEFORE="$(balance "$MINTER")"
say "mint($PRINCIPAL_XLM XLM, box=$BOX_ID, term=${TERM_SECONDS}s) — locks principal"
ID="$(stellar contract invoke --id "$NFT" --source "$MINTER_ID" "${NET[@]}" -- \
  mint --minter "$MINTER" --principal "$PRINCIPAL_STROOPS" --box_id "$BOX_ID" --term_seconds "$TERM_SECONDS" \
  2>/dev/null | tr -d '"')"
echo "  minted NFT id: $ID"
echo "  minter balance: $MINTER_BEFORE → $(balance "$MINTER") (principal locked)"

say "NFT state + term value"
stellar contract invoke --id "$NFT" --source "$IDENTITY" "${NET[@]}" --send=no -- get_nft --id "$ID"
echo "  term_value (principal + yield): $(stellar contract invoke --id "$NFT" \
  --source "$IDENTITY" "${NET[@]}" --send=no -- term_value --id "$ID")"

say "transfer NFT #$ID minter → holder"
stellar contract invoke --id "$NFT" --source "$MINTER_ID" "${NET[@]}" -- \
  transfer --id "$ID" --to "$HOLDER" >/dev/null
echo "  owner is now: $(stellar contract invoke --id "$NFT" --source "$IDENTITY" "${NET[@]}" --send=no -- owner_of --id "$ID")"

say "Waiting for maturity (${TERM_SECONDS}s + buffer)…"
sleep "$(( TERM_SECONDS + 8 ))"

HOLDER_BEFORE="$(balance "$HOLDER")"
say "redeem NFT #$ID — holder receives principal + term yield"
PAYOUT="$(stellar contract invoke --id "$NFT" --source "$HOLDER_ID" "${NET[@]}" -- \
  redeem --id "$ID" 2>/dev/null | tr -d '"')"
echo "  payout: $PAYOUT base units"
echo "  holder balance: $HOLDER_BEFORE → $(balance "$HOLDER")"

say "Proof complete ✓  yield NFT minted, transferred, and redeemed on-chain."
echo "  contract: https://stellar.expert/explorer/$NETWORK/contract/$NFT"
