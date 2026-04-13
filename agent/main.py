"""
COND v1 sidecar: HMAC-signed calls to Bun /api/internal/cond-snapshot and /cond-evaluate-all.

Setup and cron: see **COND agent sidecar** in the repository root README.md.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from google import genai
from pydantic import BaseModel, Field

app = FastAPI(title="COND Agent Sidecar", version="0.1.0")


def _verify_cron_secret(
    x_cond_cron_secret: str | None = Header(default=None, alias="X-Cond-Cron-Secret"),
) -> None:
    """If COND_CRON_SECRET is set, POST /snapshot and /run-all require the same header (for public cron URLs)."""
    expected = os.environ.get("COND_CRON_SECRET", "").strip()
    if not expected:
        return
    if not x_cond_cron_secret or x_cond_cron_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Cond-Cron-Secret")


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


def _utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    )


def _require_gemini_key() -> str:
    k = os.environ.get("GEMINI_API_KEY", "").strip()
    if not k:
        raise RuntimeError("GEMINI_API_KEY must be set")
    return k


class CondV2Proposal(BaseModel):
    action: str = Field(description="One of: harvest, rotate, rebalance, notify")
    params: dict = Field(default_factory=dict)
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)


class CondV2Output(BaseModel):
    proposals: list[CondV2Proposal] = Field(default_factory=list)


def _gemini_reason(candidate: dict) -> CondV2Output:
    """
    Gemini-powered reasoning step (Feature 9).
    We keep it conservative: propose at most 2 actions; prefer notify over rotate/rebalance.
    """
    api_key = _require_gemini_key()
    client = genai.Client(api_key=api_key)

    prompt = f"""
You are COND (Conduit) portfolio agent. Generate safe, conservative proposals.

Constraints:
- Output must match the provided JSON schema.
- Allowed actions: harvest, notify, rotate, rebalance.
- If unsure, propose notify with a short explanation (confidence <= 0.6).
- Never propose live signing; these are proposals only.
- Max 2 proposals.

Candidate JSON:
{json.dumps(candidate, separators=(",", ":"))}
"""

    resp = client.models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview"),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_json_schema": CondV2Output.model_json_schema(),
        },
    )

    return CondV2Output.model_validate_json(resp.text)


def _signed_post_internal(path: str, body: dict) -> tuple[int, dict]:
    # alias for clarity: /api/internal/*
    return _signed_post(path, body)


@app.get("/health")
def health():
    return {"ok": True, "service": "cond-agent"}


@app.post("/snapshot")
def snapshot(_: None = Depends(_verify_cron_secret)):
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
def run_all(_: None = Depends(_verify_cron_secret)):
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


@app.post("/v2/run-all")
def v2_run_all(_: None = Depends(_verify_cron_secret)):
    """
    Feature 9: Pull snapshot → Gemini proposes → push proposals to Bun via /api/internal/cond-proposal.
    """
    # Snapshot (HMAC)
    snap_body = {"request_nonce": f"py-{uuid.uuid4()}", "request_ts": _utc_now_iso()}
    snap_status, snap = _signed_post_internal("/cond-snapshot", snap_body)
    if snap_status != 200:
        return {"ok": False, "_upstreamStatus": snap_status, "snapshot": snap}

    candidates = snap.get("candidates", [])
    results: list[dict] = []

    for c in candidates:
        wallet = c.get("wallet")
        if not isinstance(wallet, str):
            continue

        try:
            out = _gemini_reason(c)
        except Exception as e:
            results.append(
                {"wallet": wallet, "ok": False, "error": str(e), "submitted": 0}
            )
            continue

        submitted = 0
        for p in out.proposals[:2]:
            body = {
                "wallet": wallet,
                "action": p.action,
                "params": p.params or {},
                "reasoning": p.reasoning,
                "confidence": float(p.confidence),
                "request_nonce": f"pyv2-{uuid.uuid4()}",
                "request_ts": _utc_now_iso(),
            }
            status, data = _signed_post_internal("/cond-proposal", body)
            if status == 200 and data.get("ok") is True:
                submitted += 1
            results.append(
                {
                    "wallet": wallet,
                    "proposal_action": p.action,
                    "proposal_confidence": float(p.confidence),
                    "status": status,
                    "response": data,
                }
            )

        results.append({"wallet": wallet, "ok": True, "submitted": submitted})

    return {"ok": True, "snapshotWallets": len(candidates), "results": results}
