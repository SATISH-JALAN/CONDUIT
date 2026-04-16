# CONDUIT

[![CI/CD](https://github.com/SATISH-JALAN/CONDUIT/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/SATISH-JALAN/CONDUIT/actions/workflows/ci-cd.yml)

Real-time yield streaming protocol on Stellar.

## Overview

Conduit is a full-stack project for tokenized bond/yield experiences:
- **Client**: React + Vite app
- **Server**: Bun + Hono API
- **Contracts**: Rust/Soroban smart contracts
- **Agent**: Optional Python FastAPI sidecar for COND automation

## Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | TypeScript, React, Vite, Tailwind CSS |
| Backend API | Bun, TypeScript, Hono |
| Smart Contracts | Rust, Soroban (Stellar), WASM |
| AI/Automation Sidecar | Python, FastAPI, HTTPX, Gemini SDK |
| Database | PostgreSQL (TimescaleDB image) + Drizzle ORM |
| Cache | Redis |
| Package Manager | pnpm |
| CI/CD | GitHub Actions (`.github/workflows/ci-cd.yml`) |

## Project Structure

```text
CONDUIT/
├── client/                  # React + Vite frontend
├── server/                  # Bun + Hono backend
├── contracts/               # Rust/Soroban contracts workspace
├── agent/                   # Optional Python sidecar
├── docs/                    # Architecture docs
├── scripts/                 # Utility/cron scripts
├── docker-compose.yml       # Local infra services
├── package.json             # Workspace scripts
├── pnpm-workspace.yaml
└── README.md
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Bun 1.x
- Docker + Docker Compose
- Rust (stable) + Cargo
- (Optional) Python 3.10+ for `agent/`

## Run Locally

All commands below are run from **repository root** unless explicitly marked otherwise.

### 1) Clone and install

```bash
git clone https://github.com/SATISH-JALAN/CONDUIT.git
cd CONDUIT
pnpm install --frozen-lockfile
```

### 2) Start local dependencies (DB + Redis + Stellar)

```bash
docker compose up -d postgres redis stellar
```

### 3) Database setup (required before server tests)

```bash
pnpm --filter server exec drizzle-kit push --force --config=drizzle.config.ts
```

### 4) Start backend and frontend

```bash
# terminal 1 (root)
pnpm --filter server dev

# terminal 2 (root)
pnpm --filter client dev
```

- Client: `http://localhost:3000`
- Server: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Common Commands

Run from **repository root**:

```bash
# typecheck/build
pnpm --filter client lint
pnpm --filter client build
pnpm --filter server build

# tests
pnpm --filter server test
cargo test --manifest-path contracts/Cargo.toml

# contracts
pnpm contracts:build
pnpm contracts:test

# infra
docker compose up -d
docker compose down
```

## Optional Python Agent (`agent/`)

Run from **`agent/` folder**:

```bash
cd agent
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8088
```

## CI/CD

Workflow file: `.github/workflows/ci-cd.yml`

### CI jobs
- Install dependencies
- Client typecheck: `pnpm --filter client lint`
- Client build: `pnpm --filter client build`
- Server tests: `pnpm --filter server test`
- Server build: `pnpm --filter server build`
- Contract tests: `cargo test --manifest-path contracts/Cargo.toml`

### CD jobs
- Trigger client deploy hook (`CLIENT_DEPLOY_HOOK_URL`)
- Trigger server deploy hook (`SERVER_DEPLOY_HOOK_URL`)

## License

MIT
