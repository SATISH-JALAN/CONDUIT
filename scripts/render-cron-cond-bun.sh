#!/usr/bin/env bash
# Render Cron (or crontab): run COND batch evaluate on the Bun API with HMAC — no Python agent.
#
# Set in Render Cron job env (same as your Web service):
#   COND_HMAC_SECRET
#   SERVER_PUBLIC_URL   e.g. https://your-api.onrender.com
#
# Command (repo root as working directory):
#   bash scripts/render-cron-cond-bun.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/server"
exec bun run cron:cond-evaluate-all
