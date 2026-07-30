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
| `scripts/faucet.sh` | Fund testnet wallets with the yield asset |
| `.env.deploy` | Generated env block (gitignored) |

## Rate oracle (authorized APY)

APY is no longer chosen by the depositor. The `rate_oracle` contract stores the
authorized APY (bps) per box, writable only by the oracle admin. At deposit time
`stream_router` reads the rate via a cross-contract call keyed by `box_id`, so a
user cannot pick their own yield rate. `deploy-testnet.sh` seeds the initial box
rates; the keeper (next phase) takes over live updates.

## Deployed instance (testnet)

The token-backed, oracle-priced protocol is live on Stellar testnet:

| Item | Value |
|:---|:---|
| **stream_router** | `CAJ7MVNYW5WEYVVHHPIGLLP726O3F3DV5RRSDG536QWO2XJGPVKEV57P` |
| **rate_oracle** | `CA6GAYOHCSN27U7E4HKU7G2BNDA4M7GSQY4VD6NBADP3ZNJY4XVK4SH5` |
| **Yield asset SAC** (native XLM) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| **Operator/admin** | `GALAHKCLSOZZRVVEU64UUUXZGDMYXVXJV2LMO4DXFQ7M7JCZE2TOJM6H` |
| Explorer | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CAJ7MVNYW5WEYVVHHPIGLLP726O3F3DV5RRSDG536QWO2XJGPVKEV57P) |

### End-to-end proof (real on-chain token movement + oracle-sourced APY)

Running `pnpm proof:e2e` produced verifiable transactions. The deposit passed **no
APY** — the contract read `420` bps from the oracle for `us-treasury-10y`:

| Action | Effect | Tx |
|:---|:---|:---|
| deposit 25 XLM into `us-treasury-10y` | user → vault `250000000`; anchor `apy_bps=420` **from oracle** | [`e27fc18e…`](https://stellar.expert/explorer/testnet/tx/e27fc18ef05f5a6be20f079ffc680a4d6098e3557a60105d1631abd668275e66) |
| harvest | vault → user accrued yield; balances update on-chain | [`bbb29513…`](https://stellar.expert/explorer/testnet/tx/bbb29513b94dc333c8d7a646b384553ddbb2d65f139bb6e0cfce952dd5252c5b) |

This confirms Conduit is no longer a simulation: deposits custody real tokens,
the APY is authorized on-chain by the oracle, and harvest settles real yield.
