# Conduit Soroban Contracts (Scaffold)

This workspace is the smart-contract foundation for Conduit.

## Included contracts

- `compliance` - KYC, sanctions, accreditation guards.
- `stream_router` - Core anchor state and yield accrual/harvest math scaffold.

## Prerequisites

- Rust stable toolchain
- `wasm32-unknown-unknown` target
- Soroban CLI (`soroban`)

## Build

From repo root:

```bash
pnpm contracts:build
```

Or directly:

```bash
cargo build --manifest-path contracts/Cargo.toml --target wasm32-unknown-unknown --release
```

## Test

From repo root:

```bash
pnpm contracts:test
```

## Suggested next steps

1. Pin `soroban-sdk` to the exact version matching your Soroban CLI/runtime.
2. Add an `admin` auth model to `compliance` write operations.
3. Wire Bun backend `shared/stellar.ts` to invoke these contract methods instead of plain payment simulation.
4. Add deploy scripts for local, testnet, and mainnet contract IDs.
