# CONDUIT

Real-time yield streaming protocol on Stellar.

## CI/CD Pipeline

GitHub Actions workflow: `.github/workflows/ci-cd.yml`

- **CI** on PRs and pushes to `main`: client typecheck/build, server tests/build, contract tests.
- **CD** on push to `main`: deploy hooks (if secrets are configured).
- Secrets required for deploy jobs:
  - `CLIENT_DEPLOY_HOOK_URL`
  - `SERVER_DEPLOY_HOOK_URL`

---

## Level 5 - Blue Belt Submission

### Submission Links

- Repository: [Conduit GitHub](https://github.com/SATISH-JALAN/Conduit)
- Live demo: _Add deployed app URL (Vercel/Netlify)_
- Demo video: _Add full MVP walkthrough video URL_
- User feedback export (Google Sheet): [Blue Belt User Responses](https://docs.google.com/spreadsheets/d/12xyoZ8JYZ-SK-yx-nJIVeBjEvcA9j7fXxJRJUaZnX2Y/edit?usp=sharing)

### Verified Testnet Users (5+)

1. `GCUOCLOPD3I7ECINEXFOJVGFQFNJILYW26BERBCCQBQ7WHJMICHR2WPM`
2. `GB2CC6D3E3SXRJUPNJ43WGMFFYEN5CNP6NRY5L2S7NUDLEAZW5IMRVLK`
3. `GBMQJ3G5LDWODZKUUQWGGT6NIKMM7KL5NLHVIG53WLNLWB27Z4AKH3F4`
4. `GDZWLHG6WBRYIGWE2JXJRI4LTXLWQSTBCSXK3XB6HLB2QOTS4DNXDSKP`
5. `GA5RKOAUAVEA5POB4HKI2HCIZ3K67SZYLUW5SOACOAKCNDSM4XLC5BPR`

### Blue Belt Requirements Status

| Requirement | Status | Evidence |
| --- | --- | --- |
| MVP fully functional | ✅ Done | Working flows across Home, Bonds, Dashboard, Agent, Race, NFTs, Creators |
| 5+ real testnet users | ✅ Done | Wallet list above + feedback sheet |
| Feedback documented | ✅ Done | Google Form responses exported and linked |
| 1 iteration completed | ✅ Done | Mobile/UI improvements implemented |
| Architecture documentation | ✅ Done | `docs/systemarch.md`, `docs/backendarch.md` |
| CI/CD pipeline | ✅ Done | `.github/workflows/ci-cd.yml` |

### Feedback Iteration (Completed)

**Iteration 1: Mobile UX and navigation**

- Fixed mobile overflow and responsive layout issues.
- Improved home, dashboard, race, docs, and navbar behavior on small screens.
- Added/updated connected wallet visibility and action accessibility.
- Commit link: _Add GitHub commit URL after push_

### Next Phase Improvement Plan

1. Faster onboarding with guided states and clearer first-action prompts.
2. Better transaction lifecycle UX (build/sign/submit/confirm).
3. Deeper portfolio analytics (history, APY trends, alerts).
4. Additional compliance and production hardening before mainnet.

---

## Product Overview

Conduit lets users deposit into tokenized bond strategies and track continuous yield accrual in real time, with user-signed harvest flows and optional AI-assisted portfolio actions.

### Core MVP Features

- Wallet onboarding and JWT auth
- Bond box discovery and deposits
- Live yield dashboard + holdings
- Yield split configuration
- Harvest transaction flow
- Yield race leaderboard and join flow
- COND agent panel (dry-run/proposal flow)
- Yield NFTs and creator pools

### Architecture Docs

- System architecture: `docs/systemarch.md`
- Backend architecture: `docs/backendarch.md`

---

## Tech Stack

- **Frontend:** React, Vite, Tailwind, GSAP
- **Backend:** Bun, Hono, TypeScript
- **Database:** PostgreSQL (Timescale optional)
- **Cache/Realtime:** Redis + WebSocket
- **Contracts:** Rust/Soroban
- **Agent Sidecar:** Python/FastAPI (optional)

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- Bun 1+
- Docker Desktop

### Setup

```bash
git clone https://github.com/SATISH-JALAN/Conduit.git
cd Conduit
pnpm install
cp .env.example .env
docker compose up -d
pnpm --filter server db:migrate
```

### Run Locally

```bash
# Terminal 1
pnpm --filter server dev

# Terminal 2
pnpm --filter client dev
```

Health check:

```bash
curl http://localhost:5000/api/health
```

---

## Useful Commands

```bash
docker compose up -d
docker compose down
pnpm --filter server dev
pnpm --filter client dev
pnpm --filter client lint
pnpm --filter server test
pnpm --filter server db:migrate
pnpm --filter server cron:cond-evaluate-all
```

---

## Optional Agent Sidecar (`agent/`)

Use this only if you want Python-based scheduled calls to internal COND endpoints.

```bash
cd agent
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8088
```

---