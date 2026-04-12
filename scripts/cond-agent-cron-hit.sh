#!/usr/bin/env bash
# Example cron / Render Cron Job: trigger the Python sidecar POST /run-all.
#
# Required env:
#   COND_AGENT_URL   Base URL only, e.g. https://cond-agent.onrender.com  (no trailing slash)
#
# Recommended in production (set the same value on the agent service as COND_CRON_SECRET):
#   COND_CRON_SECRET  If set, curl sends header X-Cond-Cron-Secret (agent must have COND_CRON_SECRET set)
#
# Render: add a Cron Job service, schedule e.g. "0 * * * *", command:
#   bash scripts/cond-agent-cron-hit.sh
# with repo root as working directory, or inline:
#   curl -fsS -X POST "$COND_AGENT_URL/run-all" -H "X-Cond-Cron-Secret: $COND_CRON_SECRET"

set -euo pipefail

BASE="${COND_AGENT_URL:-http://127.0.0.1:8088}"
BASE="${BASE%/}"
URL="${BASE}/run-all"

EXTRA=()
if [[ -n "${COND_CRON_SECRET:-}" ]]; then
  EXTRA+=(-H "X-Cond-Cron-Secret: ${COND_CRON_SECRET}")
fi

curl -fsS -X POST "${URL}" "${EXTRA[@]}" -H "Content-Type: application/json"
