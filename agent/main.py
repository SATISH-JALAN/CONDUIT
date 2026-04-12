"""
COND v1 sidecar: HMAC-signed calls to Bun /api/internal/cond-snapshot and /cond-evaluate-all.

Run locally:
  set COND_HMAC_SECRET=... && set SERVER_PUBLIC_URL=http://127.0.0.1:5000 && uvicorn main:app --reload --port 8088
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI

app = FastAPI(title="COND Agent Sidecar", version="0.1.0")


def _require_secret() -> str:
    s = os.environ.get("COND_HMAC_SECRET", "")
    if len(s) < 32:
        raise RuntimeError("COND_HMAC_SECRET must be set and at least 32 characters")
    return s


def _base_url() -> str:
    return os.environ.get("SERVER_PUBLIC_URL", "http://127.0.0.1:5000").rstrip("/")


def _sign_body(secret: str, body: dict) -> str:
    # Match Bun: JSON.stringify with no spaces (Python separators).
    payload = json.dumps(body, separators=(",", ":"))
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def _signed_post(path: str, body: dict) -> tuple[int, dict]:
    secret = _require_secret()
    sig = _sign_body(secret, body)
    url = f"{_base_url()}/api/internal{path}"
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            url,
            content=json.dumps(body, separators=(",", ":")),
            headers={
                "Content-Type": "application/json",
                "x-cond-signature": sig,
            },
        )
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text}
    return r.status_code, data if isinstance(data, dict) else {"data": data}


@app.get("/health")
def health():
    return {"ok": True, "service": "cond-agent"}


@app.post("/snapshot")
def snapshot():
    body = {
        "request_nonce": f"py-{uuid.uuid4()}",
        "request_ts": datetime.now(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z"),
    }
    status, data = _signed_post("/cond-snapshot", body)
    out = dict(data)
    out["_upstreamStatus"] = status
    return out


@app.post("/run-all")
def run_all():
    body = {
        "request_nonce": f"py-{uuid.uuid4()}",
        "request_ts": datetime.now(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z"),
    }
    status, data = _signed_post("/cond-evaluate-all", body)
    out = dict(data)
    out["_upstreamStatus"] = status
    return out
