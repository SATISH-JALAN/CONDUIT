# COND agent sidecar (Python)

Optional HTTP service that drives **Feature 6** using the same HMAC contract as the Bun server:

- `POST /snapshot` → Bun `POST /api/internal/cond-snapshot`
- `POST /run-all` → Bun `POST /api/internal/cond-evaluate-all` (dry-run internal tx per rule hit)

## Environment

| Variable | Description |
|----------|-------------|
| `COND_HMAC_SECRET` | Same secret as the Bun server (≥32 chars). |
| `SERVER_PUBLIC_URL` | Bun API origin, e.g. `http://127.0.0.1:5000` (no trailing slash). |
| `COND_CRON_SECRET` | Optional. If set, `POST /run-all` and `POST /snapshot` require header `X-Cond-Cron-Secret`. |

## Local run

From this directory:

```bash
pip install -r requirements.txt
export COND_HMAC_SECRET='your-32-plus-char-secret'
export SERVER_PUBLIC_URL=http://127.0.0.1:5000
uvicorn main:app --reload --port 8088
```

Then:

- `GET http://localhost:8088/health`
- `POST http://localhost:8088/run-all`

## Docker

From the repo root (compose passes `COND_HMAC_SECRET` from your shell env):

```bash
export COND_HMAC_SECRET='...'
docker compose up --build cond-agent
```

The sidecar calls the API on the host via `host.docker.internal` (see `docker-compose.yml`).

## Optional: lock down cron-triggered routes

If the agent is exposed on the public internet, set **`COND_CRON_SECRET`** on the agent service. Then every **`POST /snapshot`** and **`POST /run-all`** must include header:

`X-Cond-Cron-Secret: <same value>`

If `COND_CRON_SECRET` is unset (local dev), those routes stay open—only do that behind a firewall.

## Cron example (Render / Linux)

Point at your deployed agent URL and run on a schedule (e.g. hourly).

1. Set on the **agent** service: `COND_HMAC_SECRET`, `SERVER_PUBLIC_URL` (your Render API origin), and optionally `COND_CRON_SECRET`.
2. Create a **Cron Job** (or use Render Cron) with env:
   - `COND_AGENT_URL=https://your-cond-agent.onrender.com`
   - `COND_CRON_SECRET=...` (match the agent)

Command (from repo root, or copy the `curl` line):

```bash
bash scripts/cond-agent-cron-hit.sh
```

Equivalent one-liner:

```bash
curl -fsS -X POST "$COND_AGENT_URL/run-all" -H "X-Cond-Cron-Secret: $COND_CRON_SECRET"
```

## Alternative: cron without Python (Bun on Render)

If you do not deploy the Python sidecar, run the same batch job from the **server** package: it signs `POST /api/internal/cond-evaluate-all` with `COND_HMAC_SECRET`.

On Render, add a **Cron Job** with the same env as the API (`COND_HMAC_SECRET`, `SERVER_PUBLIC_URL`), root directory **`server`**, command:

```bash
bun run cron:cond-evaluate-all
```

From the **repo root** (e.g. local crontab), use:

```bash
bash scripts/render-cron-cond-bun.sh
```
