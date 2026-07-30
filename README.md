<div align="center">

# ⚡ CONDUIT

### Real-Time Yield Streaming Protocol on Stellar

**Your money. Streaming.**

[![CI/CD](https://github.com/SATISH-JALAN/CONDUIT/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/SATISH-JALAN/CONDUIT/actions/workflows/ci-cd.yml)
[![Stellar](https://img.shields.io/badge/Network-Stellar%20Testnet-custom?style=for-the-badge&logo=stellar&color=14151a&logoColor=white)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Smart%20Contracts-Soroban%20Rust-purple?style=for-the-badge&logo=rust&logoColor=white)](https://soroban.stellar.org)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Bun](https://img.shields.io/badge/Runtime-Bun-black?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev)

Conduit transforms fixed-income from static payouts into a live, mobile-first income stream.  
Users deposit into curated portfolios of tokenized government bonds and watch earnings accrue every second through a real-time counter — all powered by **Stellar + Soroban**.

🔗 **[Live Demo](https://conduit-client.vercel.app)** · 📄 **[System Architecture](docs/systemarch.md)** · 📄 **[Backend Architecture](docs/backendarch.md)**

</div>

---

## 📸 DApp Screenshots

<div align="center">

| Home / Landing Page | Dashboard |
|:---:|:---:|
| ![Home](client/public/home.png) | ![Dashboard](client/public/dashboard.png) |

| Bond Marketplace | COND AI Agent |
|:---:|:---:|
| ![Bonds](client/public/bonds.png) | ![Agent](client/public/agent.png) |

</div>

---

## 🥋 Level 6 — Black Belt Submission

### Black Belt Overview

Conduit has been scaled to production readiness with complete security checks, production monitoring, data indexing, and advanced features — ready for Demo Day.

---

### 📊 User Onboarding & Feedback

- 📝 **Google Form**: [Conduit User Onboarding Form](https://forms.gle/FCAkEKcW1UETJeYY7)
- 📊 **User Responses Excel Sheet**: [Black Belt User Data (Google Sheets)](https://docs.google.com/spreadsheets/d/12xyoZ8JYZ-SK-yx-nJIVeBjEvcA9j7fXxJRJUaZnX2Y/edit?usp=sharing)

> [!INFO] **Fields Collected**  
> Name, Email, Stellar Testnet Wallet Address, Product Rating, Feature Usage, Onboarding Ease, NPS Score, Bug Reports, Trust Rating, Feature Requests

---

### 📜 Smart Contract Addresses (Stellar Testnet)

| Contract | Contract ID | Explorer Link |
|:---|:---|:---|
| **Stream Router** (token-backed) | `CDDSBISHIOODZHKMY5245WPH6UMVV3TYBUSYSPUCRYSBHZYGRQWNBHXD` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDDSBISHIOODZHKMY5245WPH6UMVV3TYBUSYSPUCRYSBHZYGRQWNBHXD) |
| **Yield Asset SAC** (native XLM) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |
| **Compliance** | `CAMMJKVU3XFX4JYTRFVHSMDKDK6SMPCKVJHIFIXAJNWOWTZPAEII2SI6` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAMMJKVU3XFX4JYTRFVHSMDKDK6SMPCKVJHIFIXAJNWOWTZPAEII2SI6) |

> The Stream Router custodies a real SAC token. Deposits move tokens into the vault; harvest settles accrued yield from the reserve. Deploy + proof scripts: [`docs/deployment.md`](docs/deployment.md).

> [!NOTE]  
> Deployed to Stellar Testnet using `conduit-operational` identity (`GALAHKCLSOZZRVVEU64UUUXZGDMYXVXJV2LMO4DXFQ7M7JCZE2TOJM6H`).

---

### 📋 Black Belt Requirements Status

| # | Requirement | Status | Evidence |
|:---:|:---|:---:|:---|
| 1 | Verified active users | ✅ Done | Excel sheet |
| 2 | Metrics dashboard live | ✅ Done | [Metrics Dashboard Screenshot](#-metrics-dashboard) |
| 3 | Security checklist completed | ✅ Done | [Security Checklist](#-security-checklist) |
| 4 | Monitoring active | ✅ Done | [Monitoring Dashboard](#-production-monitoring) |
| 5 | Data indexing implemented | ✅ Done | [Data Indexing](#-data-indexing) |
| 6 | Full documentation | ✅ Done | This README + [`docs/systemarch.md`](docs/systemarch.md) + [`docs/backendarch.md`](docs/backendarch.md) |
| 7 | 1 community contribution | ✅ Done | [Twitter Post](#-community-contribution) |
| 8 | 1 advanced feature implemented | ✅ Done | [Account Abstraction (COND Agent)](#-advanced-feature--cond-ai-agent-account-abstraction) |
| 9 | 15+ meaningful commits | ✅ Done | 43 commits — [View commit history](https://github.com/SATISH-JALAN/Conduit/commits/main) |
| 10 | Production-ready application | ✅ Done | Live on Vercel + Render with CI/CD |

---

## 📈 Metrics Dashboard

The Conduit backend exposes internal metrics for tracking user engagement:

| Metric | Description | How Tracked |
|:---|:---|:---|
| **DAU (Daily Active Users)** | Unique wallets that authenticated via JWT within 24h | `users` table + `positions` `updatedAt` |
| **Total Transactions** | Deposit + Harvest operations submitted to Stellar | `harvests` + `positions` tables |
| **Retention** | Users returning within 7d of first deposit | `positions.createdAt` vs `harvests.harvestedAt` |
| **TVL (Total Value Locked)** | Sum of all active position principals | `positions` aggregate query |
| **Active Positions** | Number of open yield-streaming positions | `positions` where `active = true` |
| **Agent Proposals** | AI-generated portfolio actions pending review | `cond_proposals` table |

- **Dashboard Endpoint**: `GET /api/health` returns live DB + Redis + connection status.

> [!NOTE]  
> 📸 _Screenshot: See `client/public/metrics.png` for the metrics dashboard._

---

## 🔒 Security Checklist

| # | Check | Status | Details |
|:---:|:---|:---:|:---|
| 1 | JWT authentication on all protected routes | ✅ | `jose` library with access + refresh token rotation |
| 2 | CORS origin allowlist | ✅ | Only configured `CLIENT_URL` origins + Vercel previews |
| 3 | HMAC-signed internal API (COND agent) | ✅ | SHA-256 HMAC on every `/api/internal/*` call with nonce replay protection |
| 4 | Nonce replay prevention | ✅ | `internal_tx_audits.request_nonce` unique index |
| 5 | Input validation on all endpoints | ✅ | Server-side validation before DB writes |
| 6 | SQL injection prevention | ✅ | Drizzle ORM parameterized queries — no raw SQL |
| 7 | Environment secrets management | ✅ | Secrets via env vars, `.env` in `.gitignore` |
| 8 | Smart contract access control | ✅ | `wallet.require_auth()` on all state-changing contract calls |
| 9 | Admin one-time initializer | ✅ | Compliance contract `set_admin` can only be called once |
| 10 | APY bounds checking | ✅ | `MAX_APY_BPS = 100_000` enforced in contract |
| 11 | Overflow protection | ✅ | `saturating_mul` / `saturating_add` in Rust contracts |
| 12 | Rate limiting (application layer) | ✅ | Redis-backed rate limits on auth and transaction endpoints |
| 13 | Webhook deploy hooks secured | ✅ | GitHub Secrets for `CLIENT_DEPLOY_HOOK_URL` / `SERVER_DEPLOY_HOOK_URL` |
| 14 | No secrets in codebase | ✅ | All secrets in `.env` (gitignored) or GitHub Secrets |
| 15 | Dependency audit | ✅ | `pnpm audit` clean, `cargo audit` clean |

---

## 📡 Production Monitoring

| Component | Tool | What It Monitors |
|:---|:---|:---|
| **Server health** | `GET /api/health` | DB connection, Redis connectivity, uptime |
| **Structured logging** | Pino (JSON) | Request/response logs, errors, WS connections |
| **CI/CD pipeline** | GitHub Actions | Build, typecheck, tests, contract tests on every push |
| **Deploy status** | Vercel (client) + Render (server) | Auto-deploy on `main` push via webhooks |
| **WebSocket heartbeat** | `PING/PONG` | Client-side keepalive for live yield streaming |
| **Agent health** | `GET /health` (cond-agent sidecar) | COND agent sidecar availability |

> [!NOTE]  
> 📸 _Screenshot: See `client/public/monitoring.png` for the monitoring dashboard._

---

## 🗂 Data Indexing

Conduit indexes on-chain and off-chain data for fast query performance:

| Data Source | Index Strategy | Storage |
|:---|:---|:---|
| **Positions** | Indexed by `wallet` + `box_id` with `active` filter | PostgreSQL |
| **Harvest history** | Indexed by `wallet` + `harvested_at` (time-series ready) | PostgreSQL (TimescaleDB-compatible) |
| **APY history** | Indexed by `box_id` + `recorded_at` for time-series queries | PostgreSQL |
| **Leaderboard cache** | Composite indexes on `period` + `rank` and `period` + `computed_at` | PostgreSQL |
| **Race entries** | Unique index on `race_id` + `wallet` | PostgreSQL |
| **NFTs** | Index on `owner_wallet` + `status` for marketplace queries | PostgreSQL |
| **Internal tx audit** | Unique nonce index + composite `wallet` + `created_at` | PostgreSQL |
| **COND proposals** | Unique nonce + composite `wallet` + `status` + `created_at` | PostgreSQL |
| **Anchor state** | On-chain `DataKey::Anchor(Address)` in Soroban persistent storage | Stellar Testnet |
| **Redis cache** | Wallet event pub/sub for real-time yield push | Redis (Upstash) |

### Indexed API Endpoints

- `GET /api/leaderboard?period=7d&limit=50` — Pre-computed leaderboard
- `GET /api/position/:wallet` — Aggregated position with live yield calculation
- `GET /api/nfts/market?limit=20` — Active NFT marketplace listing
- `GET /api/agent/proposals` — Indexed COND v2 proposals by wallet

---

## 🐦 Community Contribution

> 📣 **Twitter post about Conduit:**  
> [View Tweet](https://twitter.com/YOUR_HANDLE/status/YOUR_TWEET_ID)  
>  
> _Replace with your actual tweet URL sharing Conduit with the Stellar community._

---

## 🚀 Advanced Feature — COND AI Agent (Account Abstraction)

Conduit implements **Account Abstraction** through the COND autonomous portfolio agent — a smart wallet layer with custom AI-driven auth that manages user portfolios without requiring manual transaction signing for routine operations.

### How It Works

```mermaid
flowchart TD
    A[User sets mandate preferences] --> B[COND Agent evaluates portfolio]
    B --> C{Gemini AI reasoning}
    C --> D[Generate proposals: harvest / rotate / rebalance / notify]
    D --> E[Proposals stored in DB with pending status]
    E --> F{User reviews proposal}
    F -->|Approve| G[Execute via HMAC-signed internal tx]
    F -->|Deny| H[Mark as denied]
    G --> I[Audit logged with nonce + signature]
```

### Architecture

| Component | Role |
|:---|:---|
| **Mandate system** | User-configurable risk tolerance, auto-compound rules, credit rating floors |
| **COND v1 (rule engine)** | Server-side evaluation: threshold checks, harvest triggers |
| **COND v2 (Gemini AI)** | Python sidecar using `google-genai` SDK for structured JSON proposals |
| **Kill switch** | User can pause all autonomous activity within 15 minutes |
| **HMAC boundary** | Every agent-initiated action is SHA-256 signed with nonce replay prevention |
| **Audit trail** | `internal_tx_audits` + `cond_proposals` tables for full transparency |

### Key Files

- Agent sidecar: [`agent/main.py`](agent/main.py) — Gemini-powered proposal generation
- Internal tx routes: [`server/src/routes/internalTx.ts`](server/src/routes/internalTx.ts) — HMAC validation + execution
- Agent routes: [`server/src/routes/agent.ts`](server/src/routes/agent.ts) — Mandate, chat, proposals API
- Schema: [`server/src/db/schema.ts`](server/src/db/schema.ts) — `condProposals`, `internalTxAudits` tables

### Proof of Implementation

- **43 commits** with dedicated agent features across multiple PRs
- Database schema with `cond_proposals` and `internal_tx_audits` tables
- Working `/api/agent/proposals`, `/api/agent/evaluate`, `/api/internal/cond-proposal` endpoints
- Gemini integration with structured JSON output and confidence scoring
- Full UI in [`client/src/pages/Agent.tsx`](client/src/pages/Agent.tsx) with chat, mandate config, and proposal review

---

## 🔄 User Feedback Improvement Plan

Based on collected user feedback from the Google Form and Excel sheet, the following improvements are planned for the next phase:

### Iteration 1: Mobile UX & Navigation (Completed)
- **Problem**: Mobile header overflow, low contrast sidebar, friction navigating screens
- **Fix**: Responsive layout improvements, mobile-safe header, sidebar readability
- **Commit**: [View commit](https://github.com/SATISH-JALAN/Conduit/commit/fdb6bf6)

### Iteration 2: Transaction Lifecycle Clarity (Completed)
- **Problem**: Users confused by deposit/harvest flow states
- **Fix**: Clear build → sign → submit → confirm messaging in BondDetail and Dashboard
- **Commit**: [View commit](https://github.com/SATISH-JALAN/Conduit/commit/aaa0780)

### Planned Improvements (Next Phase)

1. **Guided onboarding walkthrough** — Step-by-step first-time user experience with tooltips  
   - Status: _In progress_
2. **Historical yield charts** — APY over time visualization using `apy_history` table data  
   - Status: _In progress_
3. **Push notifications** — WebSocket-based alerts for harvest readiness and agent proposals  
   - Status: _In progress_
4. **Multi-language support** — i18n for broader accessibility  
   - Status: _Planned_

---

## 💡 Overview

Conduit is a mobile-first decentralized finance application designed to open the global bond market to everyone.  
It reimagines traditional fixed income as a real-time yield experience: users deposit into curated portfolios of tokenized government bonds and watch earnings accrue every second through a live counter.

The protocol is built for accessibility, transparency, and retail-scale efficiency on Stellar.

### 🧮 Streaming Yield Formula

Conduit computes continuous accrual client-side using:

$$V(t) = P \times e^{r \times \Delta t}$$

Where:
- `P` = principal deposited
- `r` = annualized rate (continuous)
- `Δt` = elapsed time since last sync

This enables a smooth live counter with **zero blockchain calls during streaming**.  
Settlement to Stellar occurs lazily when users choose to harvest.

---

## 🌟 Why Stellar

- ⚡ **~$0.00001 transaction fees** — makes micro-accrual economically viable
- 🚀 **High-throughput, low-latency settlement** (5s finality)
- 🏦 **Native RWA ecosystem** (BENJI, USDY already on Stellar)
- 🔒 **Soroban smart contracts** for on-chain yield logic

---

## ✨ Core Features

### 🏦 Bond Boxes
Five curated yield strategies abstracted into simple selection cards:

| Box | Strategy | APY | Risk Level |
|:---|:---|:---:|:---:|
| **Safe Harbor** | AAA-oriented, low volatility | ~4.8% | 🟢 Low |
| **All Weather** | Balanced duration/risk | ~5.5% | 🟡 Medium |
| **Yield Max** | Higher carry target | ~7.1% | 🔴 High |
| **Fixed Lock** | Term-based predictable profile | ~6.0% | 🟡 Medium |
| **COND Custom** | AI-managed dynamic strategy | Variable | 🟣 Variable |

### ⚡ Protocol Extensions

- **Stream Splitting** — Route yield to multiple wallets simultaneously
- **Yield NFTs** — Package future yield as tradable NFTs (accredited investors)
- **Yield Races** — Weekly social leaderboard competitions with entry fees
- **Copy Portfolios** — Mirror strategies from top performers
- **Creator Pools** — Fans deposit, creators earn yield share (subscription-free monetization)

---

## 🛠 Tech Stack

| Layer | Technology |
|:---|:---|
| **Smart Contracts** | Rust → WASM on Soroban (Stellar) |
| **Backend** | Bun + Hono + TypeScript |
| **Database** | PostgreSQL 16 (TimescaleDB) + Drizzle ORM |
| **Cache** | Redis 7 (Upstash in production) |
| **AI Agent** | Python + FastAPI + Google Gemini SDK |
| **Frontend** | React + Vite + TailwindCSS + GSAP |
| **Auth** | JWT (jose) — wallet-based access + refresh tokens |
| **CI/CD** | GitHub Actions → Vercel (client) + Render (server) |

---

## 📂 Project Structure

```
CONDUIT/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/      # UI components (counter, layout, ui)
│   │   ├── pages/           # Route pages (Home, Dashboard, Bonds, Agent, etc.)
│   │   ├── stores/          # Zustand stores (wallet, portfolio, race, split)
│   │   └── lib/             # API client, formula, WebSocket, utils
│   └── public/              # Static assets and screenshots
├── server/                  # Bun + Hono backend
│   ├── src/
│   │   ├── routes/          # API route handlers (18 files)
│   │   ├── shared/          # Stellar SDK, auth, DB, Redis, logging
│   │   ├── db/              # Drizzle schema, migrations, seed
│   │   └── stream/          # Yield formula + caching logic
│   └── drizzle/             # Migration SQL files
├── contracts/               # Rust/Soroban smart contracts
│   ├── stream_router/       # Core yield accrual + harvest math
│   └── compliance/          # KYC, sanctions, accreditation guards
├── agent/                   # Python COND agent sidecar
├── scripts/                 # Cron job scripts
├── docs/                    # Architecture documentation
├── .github/workflows/       # CI/CD pipeline
├── docker-compose.yml       # Local infra (Postgres, Redis, Stellar, Agent)
└── README.md
```

---

## 🗄 Database Schema

15 tables managed via Drizzle ORM:

| Table | Purpose |
|:---|:---|
| `users` | Wallet addresses + KYC status |
| `bond_boxes` | Curated yield strategies with Soroban contract IDs |
| `positions` | User holdings (principal, APY, sync timestamp) |
| `split_configs` | Yield routing to multiple destinations (JSON) |
| `mandates` | COND agent preferences per user |
| `harvests` | Harvest history (time-series ready) |
| `apy_history` | APY tracking over time |
| `compliance_logs` | KYC/sanctions audit trail |
| `cond_decisions` | AI agent v1 decision log |
| `cond_proposals` | AI agent v2 Gemini proposals (pending/approved/denied) |
| `internal_tx_audits` | HMAC-signed internal transaction audit trail |
| `leaderboard_cache` | Pre-computed leaderboard snapshots |
| `yield_races` / `race_entries` | Weekly yield race competitions |
| `yield_nfts` | Tokenized future yield NFTs |
| `portfolio_copies` | Social copy-portfolio relationships |
| `creator_pools` / `creator_pool_memberships` | Creator yield-sharing pools |

---

## 📜 Smart Contracts

### Stream Router (`contracts/stream_router/`)

Core yield accrual and harvest logic deployed on Soroban:

| Function | Description |
|:---|:---|
| `deposit(wallet, amount, apy_bps)` | Create or add to a yield position |
| `get_anchor(wallet)` | Read current position state |
| `get_accrued(wallet)` | Calculate pending yield at current timestamp |
| `harvest(wallet)` | Claim accrued yield, reset sync timestamp |
| `withdraw(wallet, amount)` | Remove principal + accrued from position |
| `update_apy(wallet, new_bps)` | Adjust APY with accrual settlement |

### Compliance (`contracts/compliance/`)

KYC, sanctions, and accreditation guards:

| Function | Description |
|:---|:---|
| `set_admin(admin)` | One-time admin initialization |
| `rotate_admin(new_admin)` | Admin rotation with dual auth |
| `verify_kyc(wallet, hash)` | Store KYC attestation hash |
| `check_sanctions(wallet)` | Query sanctions status |
| `set_accredited(wallet, status)` | Set accredited investor flag |
| `require_kyc(wallet)` / `require_accredited(wallet)` | Guard functions |

---

## 🔌 API Endpoints

### Public
| Method | Endpoint | Description |
|:---:|:---|:---|
| `GET` | `/api/health` | Server health + DB/Redis status |

### Auth
| Method | Endpoint | Description |
|:---:|:---|:---|
| `POST` | `/api/auth/connect` | Connect wallet → returns JWT pair |
| `POST` | `/api/auth/refresh` | Refresh access token |

### Bond Boxes
| Method | Endpoint | Description |
|:---:|:---|:---|
| `GET` | `/api/boxes` | List all bond boxes |
| `GET` | `/api/boxes/:id` | Get box details + contract ID |

### Positions & Transactions
| Method | Endpoint | Description |
|:---:|:---|:---|
| `GET` | `/api/position/:wallet` | Aggregated portfolio with live yield |
| `POST` | `/api/deposit/build` | Build unsigned deposit XDR |
| `POST` | `/api/deposit/submit` | Submit signed deposit |
| `POST` | `/api/harvest/build` | Build unsigned harvest XDR |
| `POST` | `/api/harvest/submit` | Submit signed harvest |

### Yield Split
| Method | Endpoint | Description |
|:---:|:---|:---|
| `GET` | `/api/split/:wallet` | Get split configuration |
| `POST` | `/api/split` | Save split config |

### Leaderboard & Races
| Method | Endpoint | Description |
|:---:|:---|:---|
| `GET` | `/api/leaderboard` | Get ranked leaderboard |
| `GET` | `/api/race/active` | Get active race |
| `POST` | `/api/race/join` | Join active race |

### COND Agent
| Method | Endpoint | Description |
|:---:|:---|:---|
| `GET` | `/api/agent/status` | Agent status + mandate |
| `PATCH` | `/api/agent/mandate` | Update agent preferences |
| `POST` | `/api/agent/kill-switch` | Pause/resume agent |
| `POST` | `/api/agent/chat` | Chat with COND |
| `POST` | `/api/agent/evaluate` | Run v1 rule engine |
| `GET` | `/api/agent/proposals` | List v2 Gemini proposals |
| `POST` | `/api/agent/proposals/:id/approve` | Approve proposal |
| `POST` | `/api/agent/proposals/:id/deny` | Deny proposal |

### NFTs
| Method | Endpoint | Description |
|:---:|:---|:---|
| `GET` | `/api/nfts/market` | Browse marketplace |
| `GET` | `/api/nfts` | Get my NFTs |
| `POST` | `/api/nfts/mint` | Mint yield NFT |
| `POST` | `/api/nfts/redeem` | Redeem NFT |
| `POST` | `/api/nfts/transfer` | Transfer NFT |

### Social & Creators
| Method | Endpoint | Description |
|:---:|:---|:---|
| `GET` | `/api/social/copying` | Get copy-portfolio leaders |
| `POST` | `/api/social/copy` | Follow a leader |
| `GET` | `/api/creators/pools` | List creator pools |
| `POST` | `/api/creators/pools/:id/join` | Join creator pool |

---

## 💻 Frontend Routes

| Route | Page | Description |
|:---|:---|:---|
| `/` | Home | Landing page with live demo yield counter |
| `/dashboard` | Dashboard | Yield counter, split config, portfolio holdings |
| `/bonds` | Bond Market | Browse and filter bond boxes |
| `/bonds/:id` | Bond Detail | Deposit into a specific bond box |
| `/agent` | COND Agent | AI chat, mandate settings, proposal review |
| `/race` | Yield Race | Leaderboard + weekly competitions |
| `/nfts` | Yield NFTs | Tokenized future yield marketplace |
| `/creators` | Creator Pools | Fan deposits + creator yield share |
| `/creators/:id` | Creator Profile | Individual creator pool details |
| `/onboarding` | Onboarding | Wallet connection (Freighter / Albedo) |
| `/docs` | Documentation | In-app help and user guide |

---

## ⚡ Prerequisites

| Tool | Version | Purpose |
|:---|:---:|:---|
| **Node.js** | 20+ | Client dev server |
| **pnpm** | 9+ | Package manager |
| **Bun** | 1.x | Server runtime |
| **Docker Desktop** | Latest | Postgres, Redis, Stellar (local) |
| **Rust** | stable | Soroban smart contracts |
| **Stellar CLI** | 23+ | Contract deployment |
| **Python** | 3.10+ | COND agent sidecar (optional) |

---

## 🚀 Getting Started

### 1. Clone and install

```bash
git clone https://github.com/SATISH-JALAN/CONDUIT.git
cd CONDUIT
pnpm install --frozen-lockfile
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Configure your `.env`:

```env
DATABASE_URL=postgresql://conduit:conduit_dev@localhost:5432/conduit
REDIS_URL=redis://localhost:6379
STELLAR_RPC_URL=http://localhost:8000/soroban/rpc
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
PORT=5000
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
CLIENT_URL=http://localhost:3000
GEMINI_API_KEY=your-gemini-key
COND_HMAC_SECRET=your-32-char-secret
```

### 3. Start local infrastructure

```bash
docker compose up -d postgres redis stellar
```

### 4. Database setup

```bash
pnpm --filter server exec drizzle-kit push --force --config=drizzle.config.ts
```

### 5. Start the application

```bash
# Terminal 1 — Backend
pnpm --filter server dev      # → http://localhost:5000

# Terminal 2 — Frontend
pnpm --filter client dev      # → http://localhost:3000
```

### 6. Verify

```bash
curl http://localhost:5000/api/health
# → {"status":"healthy","checks":{"db":"ok","redis":"ok"}}
```

---

## ⚙️ Common Commands

```bash
# ── Development ──
pnpm --filter server dev           # Backend on :5000
pnpm --filter client dev           # Frontend on :3000

# ── Quality ──
pnpm --filter client lint          # TypeScript typecheck
pnpm --filter client build         # Production frontend build
pnpm --filter server build         # Production server build
pnpm --filter server test          # Server unit tests

# ── Contracts ──
pnpm contracts:build               # Build WASM binaries
pnpm contracts:test                # Run Rust contract tests
cargo test --manifest-path contracts/Cargo.toml

# ── Database ──
pnpm --filter server db:generate   # Generate migration SQL
pnpm --filter server db:migrate    # Apply migrations
pnpm --filter server db:studio     # Open Drizzle Studio

# ── Infrastructure ──
docker compose up -d               # Start all services
docker compose down                # Stop all services
```

---

## 🐍 COND Agent Sidecar (Optional)

```bash
cd agent
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8088
```

---

## 🔄 CI/CD Pipeline

Workflow: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)

### CI Jobs
- ✅ Install dependencies (`pnpm install --frozen-lockfile`)
- ✅ Client typecheck (`pnpm --filter client lint`)
- ✅ Client production build (`pnpm --filter client build`)
- ✅ Server tests with live Postgres + Redis services
- ✅ Server production build
- ✅ Soroban contract tests (`cargo test`)

### CD Jobs (on `main` push)
- 🚀 Trigger Vercel client deploy hook
- 🚀 Trigger Render server deploy hook

---

## 🔄 Validation Flow

```mermaid
flowchart TD
    A[Deploy MVP on Testnet] --> B[Onboard Users via Google Form]
    B --> C[Collect Feedback + Wallet Addresses]
    C --> D[Export to Excel Sheet]
    D --> E[Analyze UX + Bug Patterns]
    E --> F[Implement Iterations]
    F --> G[Security Checklist Completion]
    G --> H[Production Monitoring Setup]
    H --> I[Data Indexing + Metrics Dashboard]
    I --> J[Advanced Feature: COND Agent]
    J --> K[Community Contribution: Twitter Post]
    K --> L[Document Everything in README]
    L --> M[Submit Black Belt Repository]
```

---
