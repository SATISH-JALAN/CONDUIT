# COND agent sidecar (Python)

Optional HTTP service that drives **Feature 6** using the same HMAC contract as the Bun server:

- `POST /snapshot` → Bun `POST /api/internal/cond-snapshot`
- `POST /run-all` → Bun `POST /api/internal/cond-evaluate-all` (dry-run internal tx per rule hit)

## Environment

| Variable | Description |
|----------|-------------|
| `COND_HMAC_SECRET` | Same secret as the Bun server (≥32 chars). |
| `SERVER_PUBLIC_URL` | Bun API origin, e.g. `http://127.0.0.1:5000` (no trailing slash). |

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
