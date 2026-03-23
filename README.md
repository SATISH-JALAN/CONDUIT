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

| Layer | Technology |
|---|---|
| **Smart Contracts** | Rust → WASM on Soroban (Stellar) |
| **Backend** | Bun + Hono + TypeScript |
| **Database** | PostgreSQL + TimescaleDB |
| **Cache** | Redis (anchor data for live counter) |
| **AI Agent** | Python + LangGraph + Claude Sonnet |
| **Frontend** | React + Vite + TailwindCSS + GSAP |
| **Auth** | JWT (jose) — wallet-based |

---

## Project Structure

```
Conduit/
├── client/                    # Frontend (Vite + React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── counter/       # YieldCounter
│   │   │   ├── layout/        # Navbar, AppLayout
│   │   │   └── ui/            # TiltCard, MagneticButton, SpotlightCard, etc.
│   │   ├── lib/               # GSAP setup, utilities
│   │   ├── pages/             # Home, Dashboard, Bonds, Agent, Race, NFTs, Creators, Onboarding
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                    # Backend (Bun + Hono)
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts      # Drizzle ORM schema (9 tables)
│   │   │   └── migrate.ts     # Migration runner
│   │   ├── routes/
│   │   │   ├── health.ts      # GET /api/health
│   │   │   └── auth.ts        # POST /api/auth/connect, /api/auth/refresh
│   │   ├── shared/
│   │   │   ├── auth.ts        # JWT generation + middleware
│   │   │   ├── db.ts          # Drizzle + postgres.js client
│   │   │   ├── logger.ts      # Pino structured logging
│   │   │   ├── redis.ts       # ioredis client
│   │   │   └── types.ts       # Zod schemas for all API types
│   │   └── index.ts           # Hono app + Bun.serve() with native WebSocket
│   ├── drizzle/               # Generated SQL migrations
│   ├── drizzle.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── docs/                      # Architecture documentation
│   ├── systemarch.md
│   └── backendarch.md
│
├── docker-compose.yml         # Postgres + Redis + Stellar Quickstart
├── .env / .env.example        # Environment variables
├── package.json               # pnpm workspace orchestrator
├── pnpm-workspace.yaml
└── README.md
```

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | 18+ | Client dev server |
| **pnpm** | 9+ | Package manager |
| **Bun** | 1.0+ | Server runtime |
| **Docker Desktop** | Latest | Postgres, Redis, Stellar |
| **Rust** | 1.70+ | Soroban smart contracts |
| **Stellar CLI** | 23+ | Contract deployment |

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
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health + DB/Redis status |

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/connect` | Connect wallet → returns JWT |
| `POST` | `/api/auth/refresh` | Refresh access token |

*More endpoints added as features are built.*

---

## Frontend Routes

| Route | Page | Description |
|---|---|---|
| `/` | Home | Landing page with live demo counter |
| `/dashboard` | Dashboard | Yield counter, split config, holdings |
| `/bonds` | Bond Market | Browse and filter bond boxes |
| `/agent` | COND Agent | AI chat interface + strategy settings |
| `/race` | Yield Race | Leaderboard + competitions |
| `/nfts` | Yield NFTs | Tokenized future yield marketplace |
| `/creators` | Creator Pools | Fan deposits + creator yield share |
| `/creators/:id` | Creator Profile | Individual creator pool details |
| `/onboarding` | Onboarding | Wallet connection (Freighter/Albedo) |

---

## Database Schema

9 tables managed via Drizzle ORM:

| Table | Purpose |
|---|---|
| `users` | Wallet addresses + KYC status |
| `bond_boxes` | Curated yield strategies |
| `positions` | User holdings (principal, APY, sync timestamp) |
| `split_configs` | Yield routing to multiple destinations |
| `mandates` | COND agent preferences per user |
| `harvests` | Harvest history (TimescaleDB hypertable) |
| `apy_history` | APY tracking over time |
| `compliance_logs` | KYC/sanctions audit trail |
| `cond_decisions` | AI agent decision log |

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

| Feature | Status | Description |
|---|---|---|
| Bond Box Catalog | 🔜 Next | Browse tokenized bond strategies |
| Live Yield Counter | 📋 Planned | Real-time streaming via WebSocket |
| Deposit & Harvest | 📋 Planned | On-chain transactions via Soroban |
| Yield Split | 📋 Planned | Route yield to multiple wallets |
| Yield Race | 📋 Planned | Social leaderboard competitions |
| COND Agent v1 | 📋 Planned | Rule-based AI portfolio manager |
| KYC & Compliance | 📋 Planned | Persona + Chainalysis integration |
| Creator Pools | 📋 Planned | Fan deposits, creator yield share |
| Yield NFTs | 📋 Planned | Tokenized future yield |
| COND Agent v2 | 📋 Planned | LangGraph + Claude reasoning |
| Stableswap AMM | 📋 Planned | Curve-style in-box bond swaps |

---

## License

MIT
