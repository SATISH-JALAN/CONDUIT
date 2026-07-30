# Conduit — Testnet Deployment & On-Chain Proof

This document covers deploying the **token-backed** `stream_router` to Stellar
testnet and proving the protocol moves real tokens end-to-end.

> Context: as of the Phase 1 upgrade, `stream_router` custodies a real Stellar
> Asset Contract (SAC) token. Deposits move tokens into the vault; harvest pays
> accrued yield out of a seeded reserve. See `docs/agile-plan-level5.md`.

## Prerequisites

- **stellar CLI 23+** — `stellar --version`
- Network access to Stellar testnet (RPC + friendbot)

## The yield asset on testnet

On testnet we use **native XLM's SAC** as the yield asset. This is a deliberate,
honest choice: it needs no trustlines or minting (friendbot funds every wallet),
so the full deposit → accrue → harvest loop is real and reproducible. On mainnet,
set `YIELD_ASSET` to the **USDC SAC** address instead — no contract changes needed.

## 1. Deploy

```bash
pnpm deploy:testnet
# or, with overrides:
IDENTITY=conduit-operational RESERVE_XLM=250 bash scripts/deploy-testnet.sh
```

This will:
1. Ensure a funded operator identity exists.
2. Build `stream_router` to wasm.
3. Resolve the yield asset SAC address.
4. Deploy the contract and call `initialize(admin, token)`.
5. Seed the vault reserve so `harvest()` can pay yield.
6. Write an env block to **`.env.deploy`** (gitignored).

## 2. Activate on the server

Merge the generated `.env.deploy` values into your server `.env`:

```env
SOROBAN_ENABLED=true
STREAM_ROUTER_CONTRACT_ID=<printed by the script>
YIELD_ASSET_ID=<printed by the script>
YIELD_ASSET_DECIMALS=7
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

With these set, `/api/deposit/*` and `/api/harvest/*` build **real contract
invocations** (see `server/src/shared/stellar.ts`). Without them, the server
falls back to the legacy native-payment path for local dev.

## 3. Prove it end-to-end

```bash
pnpm proof:e2e
# or: DEPOSIT_XLM=50 APY_BPS=700 ACCRUE_WAIT=30 bash scripts/proof-e2e.sh
```

The proof script creates a fresh funded wallet and runs a real
deposit → `get_anchor` → wait → `get_accrued` → harvest cycle, printing token
balances before/after so you can see tokens move into the vault and yield paid
back out. It also prints Stellar Expert links for the contract and wallet.

## 4. Fund additional test wallets

```bash
pnpm faucet GXXXX...      # fund an existing address
pnpm faucet               # generate + fund a fresh identity
```

## Files

| File | Purpose |
|:---|:---|
| `scripts/deploy-testnet.sh` | Deploy + initialize + seed reserve |
| `scripts/proof-e2e.sh` | Real on-chain deposit/harvest proof |
| `scripts/proof-split.sh` | Trustless on-chain yield-splitting proof |
| `scripts/proof-nft.sh` | Tokenized yield NFT mint/transfer/redeem proof |
| `scripts/faucet.sh` | Fund testnet wallets with the yield asset |
| `.env.deploy` | Generated env block (gitignored) |

## Rate oracle (authorized APY)

APY is no longer chosen by the depositor. The `rate_oracle` contract stores the
authorized APY (bps) per box, writable only by the oracle admin. At deposit time
`stream_router` reads the rate via a cross-contract call keyed by `box_id`, so a
user cannot pick their own yield rate. `deploy-testnet.sh` seeds the initial box
rates; the rate keeper (below) then keeps them live.

## Rate keeper (live on-chain rates)

The rate keeper publishes each active box's current APY to the oracle on a
schedule and records it in `apy_history`. It is the only place the **server**
signs a transaction — with the oracle admin (operator) key.

```bash
# From the server directory, with these env vars set:
#   SOROBAN_ENABLED=true
#   RATE_ORACLE_CONTRACT_ID=<deployed oracle>
#   STELLAR_OPERATIONAL_SECRET=<oracle admin secret key>   # server-side only
#   SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
#   DATABASE_URL=<postgres>
pnpm --filter server cron:rates-keeper
```

- Rate model: `server/src/keeper/rates.ts` derives each box's APY from its
  reference rate plus a small bounded drift (`RATE_DRIFT_BPS`). Swap the source
  (treasury/Benji/Reflector feed) by changing `computeRate` only.
- Run it on a scheduler (Render Cron / GitHub Actions) for continuous updates.
- **Proven:** a server-signed write set `keeper-proof → 777` on-chain
  ([tx `09eab54a…`](https://stellar.expert/explorer/testnet/tx/09eab54a7616c44b3c979e34085c3def6438b065724a5c987b0a2501b77be353)),
  confirmed by reading `get_rate` back as `777`.

## Deployed instance (testnet)

The token-backed, oracle-priced protocol is live on Stellar testnet:

| Item | Value |
|:---|:---|
| **stream_router** | `CAVEU4LV3YYPD7QHGZVHP426TY7LEWNJVSEQ5QQD7IL6A6KSKZEMZHR6` |
| **rate_oracle** | `CBM6WE3EWRWEBCV6WM7HC7HLKRM7DRJWA3XLKMJGFV26PRSZOOYCQSJS` |
| **yield_nft** | `CB3S6CXTWJA6ECA5SCSZONOHJW5QJRHO467Q5EWG7NQUSS5UGJBSWWWI` |
| **Yield asset SAC** (native XLM) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| **Operator/admin** | `GALAHKCLSOZZRVVEU64UUUXZGDMYXVXJV2LMO4DXFQ7M7JCZE2TOJM6H` |
| Explorer | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CAVEU4LV3YYPD7QHGZVHP426TY7LEWNJVSEQ5QQD7IL6A6KSKZEMZHR6) |

### Proofs (run against the deployed instance)

Two scripts produce verifiable on-chain transactions:

- **`pnpm proof:e2e`** — deposit → accrue → harvest. The deposit passes **no APY**;
  the contract reads it from the oracle (e.g. `420` bps for `us-treasury-10y`), then
  harvest settles real yield from the vault back to the user.
- **`pnpm proof:split`** — trustless on-chain yield splitting. A 70/30 split is set,
  then a single `harvest` routes the accrued yield to both destinations **inside the
  contract** (two transfer events in one tx), e.g. `59` base units → `41` (70%) + `18`
  (30%): [tx `6dd34ee8…`](https://stellar.expert/explorer/testnet/tx/6dd34ee85c0c5119ef773af9cb5cc176100d6763482b5d59a2872e332a00b808).
- **`pnpm proof:nft`** — tokenized yield NFTs. Accredits a minter, mints a yield NFT
  (locking principal, term APY from the oracle), transfers it to a second holder,
  then after maturity the holder redeems it for principal + term yield and the NFT is
  burned — all real on-chain token movements.

This confirms Conduit is no longer a simulation: deposits custody real tokens, the
APY is authorized on-chain by the oracle, harvest settles real yield, split routing
is enforced by the contract, and future yield is a real transferable NFT.
