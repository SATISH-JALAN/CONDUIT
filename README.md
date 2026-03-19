# CONDUIT
## Real-Time Yield Streaming Protocol on Stellar

<div align="center">

**Your money. Streaming.**

Conduit transforms fixed-income from static payouts into a live, mobile-first income stream.

</div>

---

## Overview

Conduit is a mobile-first decentralized finance application designed to open the global bond market to everyone.
It reimagines traditional fixed income as a real-time yield experience: users deposit into curated portfolios of tokenized government bonds and watch earnings accrue every second through a live counter.

The protocol is built for accessibility, transparency, and retail-scale efficiency on Stellar.

---

## Core Product Experience

Users deposit into curated bond strategies backed by real institutional-grade RWAs, including:

- **Franklin Templeton BENJI**
- **Ondo Finance USDY**
- **KRWQ** (Korean Government Bonds via Shinhan)

Instead of waiting for periodic distributions, users see yield stream in real time.

### Streaming Yield Formula

Conduit computes continuous accrual client-side using:

`V(t) = P × e^(r × Δt)`

Where:
- `P` = principal
- `r` = annualized rate converted to continuous time
- `Δt` = elapsed time

This enables a smooth live counter with **zero blockchain calls during streaming**.
Settlement to Stellar occurs lazily when users choose to harvest.

---

## Why Stellar

Conduit is built on Stellar + Soroban to make continuous distribution viable:

- **~$0.00001 transaction fees**
- High-throughput, low-latency settlement
- Cost structure suitable for frequent micro-accrual operations

This allows user experiences that are economically impractical on high-fee chains.

---

## Bond Boxes

Conduit abstracts DeFi complexity into five curated yield strategies:

1. **Safe Harbor** — AAA-oriented, lower-volatility profile (~4.8% APY)
2. **All Weather** — balanced duration/risk allocation
3. **Yield Max** — higher carry target (~7.1% APY)
4. **Fixed Lock** — term-based predictable profile
5. **COND Custom** — dynamically managed AI strategy

The interface is intentionally selection-first and familiar, like choosing playlists.

---

## COND: Autonomous Portfolio Agent

COND is Conduit’s AI portfolio layer, built on **LangGraph** with **Claude** as the reasoning engine.

Capabilities include:
- Monitoring market and credit conditions
- Detecting deterioration signals early
- Rebalancing and rotation logic
- Auto-compounding yield
- Immutable on-chain decision logging for auditability

### Safety + Control

- User-controlled **Kill Switch**
- Pauses all autonomous agent activity within 15 minutes
- User withdrawal visibility and control remain intact

---

## Protocol Extensions

Beyond core streaming yield:

- **Stream Splitting**: route yield to multiple wallets
- **Yield Tokenization**: package future yield as tradable NFTs (accredited investors only)
- **Yield Races**: social weekly leaderboard competitions
- **Copy Portfolios**: strategy mirroring
- **Creator Pools**: fans deposit, creators earn yield share (subscription-free monetization)

---

## Tech Stack

### Smart Contracts
- Soroban smart contracts (**Rust**)

### Backend
- **Bun + TypeScript** monolith

### AI/Agent Layer
- **Python + LangGraph + Claude**

### Client Apps
- **React Native + Expo** (mobile)
- **Next.js** (web portal)

### Data Layer
- **PostgreSQL**
- **TimescaleDB**
- **Redis**

---

## Current Status

**MVP deployed on Stellar Futurenet testnet.**

Operational modules include:
- `compliance.rs`
- `stream_router.rs`
- `bond_box.rs`

Current frontend includes:
- Landing page
- Live yield counter
- Bond Box selection
- COND terminal log
- Leaderboard + race mechanics

---

## Local Frontend (this repository)

### Prerequisites
- Node.js 18+
- pnpm

### Install
```bash
pnpm install
```

### Run locally
```bash
pnpm dev
```

Default local URL:
- `http://localhost:3000`

### Type-check
```bash
pnpm lint
```

### Build
```bash
pnpm build
```

---

## Project Routes

| Route | Description |
|---|---|
| `/` | Marketing landing page |
| `/dashboard` | Stream dashboard |
| `/bonds` | Bond Box marketplace |
| `/agent` | COND agent interface |
| `/race` | Yield race and leaderboard |
| `/onboarding` | User onboarding flow |

---
