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

## Level 5 - Blue Belt Submission

### Blue Belt Overview

Conduit has been built and validated as a real-world Stellar Testnet MVP with user onboarding, feedback collection, and iteration.

### Submission Evidence

- Repository: [Conduit GitHub](https://github.com/SATISH-JALAN/Conduit)
- Live demo: _Add deployed app URL (Vercel/Netlify)_
- Demo video: _Add full MVP walkthrough video URL_
- User feedback export (Google Sheet): [Blue Belt User Responses](https://docs.google.com/spreadsheets/d/12xyoZ8JYZ-SK-yx-nJIVeBjEvcA9j7fXxJRJUaZnX2Y/edit?usp=sharing)
- Architecture docs:
  - [System Architecture](docs/systemarch.md)
  - [Backend Architecture](docs/backendarch.md)

### Verified Testnet Users (5+)

Add at least 5 real tester wallet addresses below and keep them verifiable on Stellar Explorer:

1. _Add wallet address_
2. _Add wallet address_
3. _Add wallet address_
4. _Add wallet address_
5. _Add wallet address_

### Blue Belt Requirements Status

| Requirement                | Status           | Evidence                                                                                  |
| -------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| MVP fully functional       | ✅ Done          | Live product flows implemented across Home, Bonds, Dashboard, Agent, Race, NFTs, Creators |
| 5+ real testnet users      | ✅ In Validation | User onboarding + feedback collection sheet linked above                                  |
| Feedback documented        | ✅ Done          | Structured feedback questions and exported response sheet                                 |
| 1 iteration completed      | ✅ Done          | Mobile UX and header/navigation improvements integrated                                   |
| Architecture documentation | ✅ Done          | `docs/systemarch.md`, `docs/backendarch.md`                                               |

### MVP Features Delivered In Blue Belt

- Wallet onboarding and authentication flow
- Bond box discovery and selection experience
- Real-time yield streaming dashboard
- Yield split configuration across destinations
- Harvest transaction flow and status handling
- NFT and social/creator surfaces for protocol extensions
- Documentation and help pages for onboarding support

### User Validation and Onboarding Artifacts

- Google Form based user onboarding and product feedback collection
- Captured user details fields: name, email, Stellar testnet wallet, rating, onboarding ease, feature usage, NPS, bug report, trust rating, next feature request
- Exported responses attached via spreadsheet link in this README

### Feedback Iteration Log (Blue Belt)

**Iteration 1: Mobile usability and navigation clarity**

- Problem reported by test users: mobile header overflow, hard-to-access actions, low contrast in sidebar, and friction while navigating key screens
- Changes shipped:
  - Responsive layout improvements in app shell and home flow
  - Better mobile-safe header behavior and overflow control
  - Improved sidebar readability and action accessibility
- Commit link: _Add GitHub commit URL after push_

### Next Phase Improvement Plan

Based on current user feedback, the next phase will focus on:

1. Faster first-time onboarding with guided walkthrough states
2. Clearer transaction lifecycle messaging (build, sign, submit, confirm)
3. Improved mobile density and touch ergonomics for dashboard controls
4. Extended analytics (historical APY/yield charts and alerting)

### Blue Belt Validation Flow

```mermaid
flowchart TD
	A[Deploy MVP on Testnet] --> B[Onboard Users]
	B --> C[Collect Feedback via Google Form]
	C --> D[Export Responses to Sheet]
	D --> E[Analyze UX and Bug Patterns]
	E --> F[Implement Iteration]
	F --> G[Document Improvements in README]
	G --> H[Submit Blue Belt Repository]
```

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
- Native RWA ecosystem (BENJI, USDY already on Stellar)

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

COND is Conduit's AI portfolio layer, built on **LangGraph** with **Claude** as the reasoning engine.

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

| Layer               | Technology                           |
| ------------------- | ------------------------------------ |
| **Smart Contracts** | Rust → WASM on Soroban (Stellar)     |
| **Backend**         | Bun + Hono + TypeScript              |
| **Database**        | PostgreSQL + TimescaleDB             |
| **Cache**           | Redis (anchor data for live counter) |
| **AI Agent**        | Python + LangGraph + Claude Sonnet   |
| **Frontend**        | React + Vite + TailwindCSS + GSAP    |
| **Auth**            | JWT (jose) — wallet-based            |

---

## Project Structure

```
Conduit/
├── Root/
│   ├── .env
│   ├── .env.example
│   ├── .git/
│   ├── .gitignore
│   ├── .vscode/
│   ├── client/
│   ├── contracts/
│   ├── docker-compose.yml
│   ├── docs/
│   ├── node_modules/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── pnpm-workspace.yaml
│   ├── README.md
│   └── server/
│
├── client/ (Client App)
│   ├── dist/
│   ├── index.html
│   ├── node_modules/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── counter/
│   │   │   │   └── YieldCounter.tsx
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   └── Navbar.tsx
│   │   │   └── ui/
│   │   │       ├── CustomCursor.tsx
│   │   │       ├── GlassCard.tsx
│   │   │       ├── MagneticButton.tsx
│   │   │       ├── ScrambleText.tsx
│   │   │       ├── Skeleton.tsx
│   │   │       ├── SplitText.tsx
│   │   │       ├── SpotlightCard.tsx
│   │   │       ├── TiltCard.tsx
│   │   │       └── Tooltip.tsx
│   │   ├── index.css
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── formula.ts
│   │   │   ├── gsap.ts
│   │   │   ├── utils.ts
│   │   │   └── ws.ts
│   │   ├── main.tsx
│   │   ├── pages/
│   │   │   ├── Agent.tsx
│   │   │   ├── BondDetail.tsx
│   │   │   ├── Bonds.tsx
│   │   │   ├── CreatorProfile.tsx
│   │   │   ├── Creators.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Docs.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── NFTs.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   └── Race.tsx
│   │   └── stores/
│   │       ├── portfolioStore.ts
│   │       ├── raceStore.ts
│   │       ├── splitStore.ts
│   │       └── walletStore.ts
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/ (Server App)
│   ├── dist/
│   ├── drizzle/
│   │   ├── 0000_brave_catseye.sql
│   │   ├── 0001_split_config_wallet_json.sql
│   │   ├── 0002_leaderboard_race.sql
│   │   ├── 0003_agent_nft_social.sql
│   │   └── meta/
│   │       ├── 0000_snapshot.json
│   │       └── _journal.json
│   ├── drizzle.config.ts
│   ├── node_modules/
│   ├── package.json
│   ├── src/
│   │   ├── db/
│   │   │   ├── migrate.ts
│   │   │   ├── schema.ts
│   │   │   └── seed.ts
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── agent.ts
│   │   │   ├── auth.ts
│   │   │   ├── boxes.ts
│   │   │   ├── deposit.ts
│   │   │   ├── harvest.ts
│   │   │   ├── health.ts
│   │   │   ├── leaderboard.ts
│   │   │   ├── nfts.ts
│   │   │   ├── position.ts
│   │   │   ├── race.test.ts
│   │   │   ├── race.ts
│   │   │   ├── social.ts
│   │   │   ├── split.test.ts
│   │   │   └── split.ts
│   │   ├── shared/
│   │   │   ├── auth.ts
│   │   │   ├── db.ts
│   │   │   ├── leaderboard.ts
│   │   │   ├── logger.ts
│   │   │   ├── redis.ts
│   │   │   ├── stellar.ts
│   │   │   └── types.ts
│   │   └── stream/
│   │       ├── cache.ts
│   │       └── formula.ts
│   └── tsconfig.json
│
├── contracts/ (Smart Contracts)
│   ├── .cargo/
│   │   └── config.toml
│   ├── Cargo.lock
│   ├── Cargo.toml
│   ├── README.md
│   ├── rust-toolchain.toml
│   ├── compliance/
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   └── lib.rs
│   │   └── test_snapshots/
│   │       └── tests/
│   │           ├── get_admin_returns_initialized_admin.1.json
│   │           ├── sanctions_default_false.1.json
│   │           ├── set_admin_is_one_time_initializer.1.json
│   │           ├── verify_kyc_persists_hash.1.json
│   │           ├── verify_kyc_persists_hash_with_admin.1.json
│   │           └── verify_kyc_requires_admin_setup.1.json
│   ├── stream_router/
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   └── lib.rs
│   │   └── test_snapshots/
│   │       └── tests/
│   │           ├── accrual_increases_over_time.1.json
│   │           ├── deposit_rejects_apy_above_limit.1.json
│   │           ├── deposit_rejects_zero_apy.1.json
│   │           ├── harvest_resets_pending_yield.1.json
│   │           └── withdraw_rejects_amount_above_total.1.json
│   └── target/
│
└── docs/ (Docs)
	├── backendarch.md
	└── systemarch.md
```

---

## Prerequisites

| Tool               | Version | Purpose                  |
| ------------------ | ------- | ------------------------ |
| **Node.js**        | 18+     | Client dev server        |
| **pnpm**           | 9+      | Package manager          |
| **Bun**            | 1.0+    | Server runtime           |
| **Docker Desktop** | Latest  | Postgres, Redis, Stellar |
| **Rust**           | 1.70+   | Soroban smart contracts  |
| **Stellar CLI**    | 23+     | Contract deployment      |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/SATISH-JALAN/Conduit.git
cd Conduit
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values (defaults work for local dev):

```env
DATABASE_URL=postgresql://conduit:conduit_dev@localhost:5432/conduit
REDIS_URL=redis://localhost:6379
STELLAR_RPC_URL=http://localhost:8000/soroban/rpc
PORT=5000
JWT_SECRET=your-secret-here
CLIENT_URL=http://localhost:3000
```

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts:

- **PostgreSQL 16 + TimescaleDB** on port `5432`
- **Redis 7** on port `6379`
- **Stellar Quickstart** (local blockchain) on port `8000`

### 4. Install dependencies

```bash
pnpm install
```

### 5. Run database migrations

```bash
pnpm --filter server db:migrate
```

### 6. Start the app

```bash
# Terminal 1 — Backend
pnpm --filter server dev      # → http://localhost:5000

# Terminal 2 — Frontend
pnpm --filter client dev      # → http://localhost:3000
```

### Verify it works

```bash
# Health check (should return {"status":"healthy"})
curl http://localhost:5000/api/health
```

---

## API Endpoints

### Public

| Method | Endpoint      | Description                     |
| ------ | ------------- | ------------------------------- |
| `GET`  | `/api/health` | Server health + DB/Redis status |

### Auth

| Method | Endpoint            | Description                  |
| ------ | ------------------- | ---------------------------- |
| `POST` | `/api/auth/connect` | Connect wallet → returns JWT |
| `POST` | `/api/auth/refresh` | Refresh access token         |

_More endpoints added as features are built._

---

## Frontend Routes

| Route           | Page            | Description                           |
| --------------- | --------------- | ------------------------------------- |
| `/`             | Home            | Landing page with live demo counter   |
| `/dashboard`    | Dashboard       | Yield counter, split config, holdings |
| `/bonds`        | Bond Market     | Browse and filter bond boxes          |
| `/agent`        | COND Agent      | AI chat interface + strategy settings |
| `/race`         | Yield Race      | Leaderboard + competitions            |
| `/nfts`         | Yield NFTs      | Tokenized future yield marketplace    |
| `/creators`     | Creator Pools   | Fan deposits + creator yield share    |
| `/creators/:id` | Creator Profile | Individual creator pool details       |
| `/onboarding`   | Onboarding      | Wallet connection (Freighter/Albedo)  |

---

## Database Schema

9 tables managed via Drizzle ORM:

| Table             | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `users`           | Wallet addresses + KYC status                  |
| `bond_boxes`      | Curated yield strategies                       |
| `positions`       | User holdings (principal, APY, sync timestamp) |
| `split_configs`   | Yield routing to multiple destinations         |
| `mandates`        | COND agent preferences per user                |
| `harvests`        | Harvest history (TimescaleDB hypertable)       |
| `apy_history`     | APY tracking over time                         |
| `compliance_logs` | KYC/sanctions audit trail                      |
| `cond_decisions`  | AI agent decision log                          |

---

## Useful Commands

```bash
# Infrastructure
docker compose up -d               # Start Postgres, Redis, Stellar
docker compose down                # Stop all containers

# Development
pnpm --filter server dev           # Backend on :5000
pnpm --filter client dev           # Frontend on :3000

# Database
pnpm --filter server db:generate   # Generate migration SQL from schema changes
pnpm --filter server db:migrate    # Apply migrations
pnpm --filter server db:studio     # Open Drizzle Studio (DB browser)

# Build
pnpm --filter client build         # Production frontend build
pnpm --filter server build         # Production server build
```

---

## Feature Roadmap

| Feature            | Status     | Description                       |
| ------------------ | ---------- | --------------------------------- |
| Bond Box Catalog   | 🔜 Next    | Browse tokenized bond strategies  |
| Live Yield Counter | 📋 Planned | Real-time streaming via WebSocket |
| Deposit & Harvest  | 📋 Planned | On-chain transactions via Soroban |
| Yield Split        | 📋 Planned | Route yield to multiple wallets   |
| Yield Race         | 📋 Planned | Social leaderboard competitions   |
| COND Agent v1      | 📋 Planned | Rule-based AI portfolio manager   |
| KYC & Compliance   | 📋 Planned | Persona + Chainalysis integration |
| Creator Pools      | 📋 Planned | Fan deposits, creator yield share |
| Yield NFTs         | 📋 Planned | Tokenized future yield            |
| COND Agent v2      | 📋 Planned | LangGraph + Claude reasoning      |
| Stableswap AMM     | 📋 Planned | Curve-style in-box bond swaps     |

---

## License

MIT
