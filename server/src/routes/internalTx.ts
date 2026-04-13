import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../shared/db.js";
import { condDecisions, internalTxAudits, mandates, users } from "../db/schema.js";
import {
  internalCondSnapshotRequestSchema,
  condProposalSchema,
  internalTxRequestSchema,
} from "../shared/types.js";
import { verifyHmacHex } from "../shared/hmac.js";
import { buildCondSnapshot } from "../shared/condSnapshot.js";
import { runCondEvaluateAll } from "../shared/condEvaluate.js";
import { desc, eq } from "drizzle-orm";
import { logger } from "../shared/logger.js";
import { publishWalletEvent } from "../shared/redis.js";
import { condProposals } from "../db/schema.js";

const app = new Hono();

function requireCondSecret(): string {
  const secret = process.env.COND_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "COND_HMAC_SECRET is missing or too short (min 32 chars recommended)",
    );
  }
  return secret;
}

function normalizeHex(value: string): string {
  return value.trim().toLowerCase().replace(/^0x/, "");
}

function parseIso(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function requireStringParam(
  params: Record<string, unknown>,
  key: string,
): string | null {
  const v = params[key];
  if (typeof v !== "string" || v.trim().length === 0) return null;
  return v.trim();
}

// POST /api/internal/tx
// HMAC-protected internal endpoint for COND agent / rule-engine.
app.post("/tx", zValidator("json", internalTxRequestSchema), async (c) => {
  const signatureHeader = c.req.header("x-cond-signature") || "";
  const signature = normalizeHex(signatureHeader);

  const body = c.req.valid("json");
  const requestTs = parseIso(body.request_ts);

  // Strong replay window: reject if timestamp is too old or too far in future.
  const MAX_SKEW_MS = 2 * 60 * 1000;
  if (!requestTs) {
    return c.json({ error: "Invalid request_ts" }, 400);
  }
  if (Math.abs(Date.now() - requestTs.getTime()) > MAX_SKEW_MS) {
    return c.json({ error: "Request timestamp outside allowed window" }, 401);
  }

  // Verify signature over a canonical payload (stable JSON string).
  // Canonicalization choice: JSON.stringify of the validated body.
  // The agent must sign the exact same JSON string.
  const payload = JSON.stringify(body);
  let ok = false;
  try {
    const secret = requireCondSecret();
    ok = signature.length > 0 && verifyHmacHex(secret, payload, signature);
  } catch (err: any) {
    logger.error({ err: err.message }, "Internal tx secret misconfigured");
    return c.json({ error: "Internal execution misconfigured" }, 500);
  }

  if (!ok) {
    // Do not leak expected signature details.
    try {
      await db.insert(internalTxAudits).values({
        wallet: body.wallet,
        action: body.action,
        requestNonce: body.request_nonce,
        requestTs,
        requestBody: body,
        signature: signatureHeader || "missing",
        dryRun: body.dry_run,
        result: "rejected",
        error: "invalid_signature",
      });
    } catch (err: any) {
      // Ignore nonce collisions here; auth failure response remains the same.
      const isUniqueViolation =
        typeof err?.code === "string" ? err.code === "23505" : false;
      if (!isUniqueViolation) {
        logger.warn({ err }, "Internal tx audit insert failed (auth reject)");
      }
    }
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Action-specific validation (dry-run mode still validates strongly).
  // This prevents the agent from sending malformed or ambiguous payloads.
  if (body.action === "harvest") {
    const boxId = requireStringParam(body.params, "box_id");
    if (!boxId) {
      return c.json({ error: "Missing required params.box_id for harvest" }, 400);
    }
  }

  if (body.action === "notify") {
    const message = requireStringParam(body.params, "message");
    if (!message) {
      return c.json({ error: "Missing required params.message for notify" }, 400);
    }
  }

  // Ensure user exists for FK consistency in downstream tables.
  await db.insert(users).values({ wallet: body.wallet }).onConflictDoNothing();

  // Mandate / kill-switch check.
  const [mandate] = await db
    .select({ paused: mandates.paused })
    .from(mandates)
    .where(eq(mandates.wallet, body.wallet))
    .limit(1);

  if (mandate?.paused) {
    try {
      await db.insert(internalTxAudits).values({
        wallet: body.wallet,
        action: body.action,
        requestNonce: body.request_nonce,
        requestTs,
        requestBody: body,
        signature: signatureHeader,
        dryRun: body.dry_run,
        result: "rejected",
        error: "kill_switch_active",
      });
    } catch (err: any) {
      const isUniqueViolation =
        typeof err?.code === "string" ? err.code === "23505" : false;
      if (!isUniqueViolation) {
        logger.warn({ err }, "Internal tx audit insert failed (kill-switch)");
      }
    }
    return c.json({ error: "Kill-switch active" }, 403);
  }

  // Execution: production-safe default.
  // We accept and audit dry-run requests; live execution will be added in the executor layer.
  if (!body.dry_run) {
    try {
      await db.insert(internalTxAudits).values({
        wallet: body.wallet,
        action: body.action,
        requestNonce: body.request_nonce,
        requestTs,
        requestBody: body,
        signature: signatureHeader,
        dryRun: false,
        result: "rejected",
        error: "live_execution_not_enabled",
      });
    } catch (err: any) {
      const isUniqueViolation =
        typeof err?.code === "string" ? err.code === "23505" : false;
      if (!isUniqueViolation) {
        logger.warn({ err }, "Internal tx audit insert failed (live reject)");
      }
    }
    return c.json(
      { error: "Live execution not enabled on this deployment" },
      501,
    );
  }

  // Strict replay protection:
  // request_nonce must be globally unique; reuse is rejected even if signature is valid.
  try {
    await db.insert(internalTxAudits).values({
      wallet: body.wallet,
      action: body.action,
      requestNonce: body.request_nonce,
      requestTs,
      requestBody: body,
      signature: signatureHeader,
      dryRun: true,
      result: "accepted",
    });
  } catch (err: any) {
    // Unique index on request_nonce triggers here on replay.
    const message = typeof err?.message === "string" ? err.message : "";
    const isUniqueViolation =
      typeof err?.code === "string"
        ? err.code === "23505"
        : message.includes("duplicate key") ||
          message.includes("internal_tx_audits_request_nonce_idx");

    if (isUniqueViolation) {
      return c.json({ error: "Replay detected (nonce already used)" }, 409);
    }

    logger.error({ err }, "Internal tx audit insert failed");
    return c.json({ error: "Failed to record internal request" }, 500);
  }

  // Record a human-readable decision artifact (powers the Agent UI feed).
  const confidenceRaw = body.params["confidence"];
  const confidence =
    typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : undefined;

  const reasoning =
    requireStringParam(body.params, "reasoning") ||
    (body.action === "notify"
      ? requireStringParam(body.params, "message") || "COND notification"
      : "COND dry-run decision recorded");

  await db.insert(condDecisions).values({
    wallet: body.wallet,
    action: body.action,
    reasoning,
    confidence: confidence !== undefined ? confidence.toFixed(3) : null,
    executed: false,
  });

  // Notify clients in real-time (demo-friendly, still safe).
  await publishWalletEvent(body.wallet, {
    type: "COND_ACTION",
    data: {
      action: body.action,
      reasoning,
      confidence: confidence ?? 0.5,
    },
  });

  return c.json({
    ok: true,
    accepted: true,
    dry_run: true,
  });
});

// POST /api/internal/cond-snapshot — HMAC body: { request_nonce, request_ts } (JSON.stringify order).
app.post(
  "/cond-snapshot",
  zValidator("json", internalCondSnapshotRequestSchema),
  async (c) => {
    const signatureHeader = c.req.header("x-cond-signature") || "";
    const signature = normalizeHex(signatureHeader);
    const body = c.req.valid("json");
    const requestTs = parseIso(body.request_ts);

    const MAX_SKEW_MS = 2 * 60 * 1000;
    if (!requestTs) {
      return c.json({ error: "Invalid request_ts" }, 400);
    }
    if (Math.abs(Date.now() - requestTs.getTime()) > MAX_SKEW_MS) {
      return c.json({ error: "Request timestamp outside allowed window" }, 401);
    }

    let secret: string;
    try {
      secret = requireCondSecret();
    } catch (err: any) {
      logger.error({ err: err.message }, "Internal tx secret misconfigured");
      return c.json({ error: "Internal execution misconfigured" }, 500);
    }

    const payload = JSON.stringify(body);
    const sigOk =
      signature.length > 0 && verifyHmacHex(secret, payload, signature);
    if (!sigOk) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const snap = await buildCondSnapshot();
    return c.json({ ok: true, ...snap });
  },
);

// POST /api/internal/cond-evaluate-all — same HMAC contract as cond-snapshot.
app.post(
  "/cond-evaluate-all",
  zValidator("json", internalCondSnapshotRequestSchema),
  async (c) => {
    const signatureHeader = c.req.header("x-cond-signature") || "";
    const signature = normalizeHex(signatureHeader);
    const body = c.req.valid("json");
    const requestTs = parseIso(body.request_ts);

    const MAX_SKEW_MS = 2 * 60 * 1000;
    if (!requestTs) {
      return c.json({ error: "Invalid request_ts" }, 400);
    }
    if (Math.abs(Date.now() - requestTs.getTime()) > MAX_SKEW_MS) {
      return c.json({ error: "Request timestamp outside allowed window" }, 401);
    }

    let secret: string;
    try {
      secret = requireCondSecret();
    } catch (err: any) {
      logger.error({ err: err.message }, "Internal tx secret misconfigured");
      return c.json({ error: "Internal execution misconfigured" }, 500);
    }

    const payload = JSON.stringify(body);
    const sigOk =
      signature.length > 0 && verifyHmacHex(secret, payload, signature);
    if (!sigOk) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const out = await runCondEvaluateAll();
      return c.json(out);
    } catch (err: any) {
      logger.error({ err: err?.message }, "cond-evaluate-all failed");
      return c.json(
        { error: err?.message || "cond-evaluate-all failed" },
        500,
      );
    }
  },
);

// POST /api/internal/cond-proposal — HMAC ingest for Gemini/LangGraph proposals.
app.post(
  "/cond-proposal",
  zValidator("json", condProposalSchema),
  async (c) => {
    const signatureHeader = c.req.header("x-cond-signature") || "";
    const signature = normalizeHex(signatureHeader);
    const body = c.req.valid("json");
    const requestTs = parseIso(body.request_ts);

    const MAX_SKEW_MS = 2 * 60 * 1000;
    if (!requestTs) return c.json({ error: "Invalid request_ts" }, 400);
    if (Math.abs(Date.now() - requestTs.getTime()) > MAX_SKEW_MS) {
      return c.json({ error: "Request timestamp outside allowed window" }, 401);
    }

    let secret: string;
    try {
      secret = requireCondSecret();
    } catch (err: any) {
      logger.error({ err: err.message }, "Internal tx secret misconfigured");
      return c.json({ error: "Internal execution misconfigured" }, 500);
    }

    const payload = JSON.stringify(body);
    const sigOk =
      signature.length > 0 && verifyHmacHex(secret, payload, signature);
    if (!sigOk) return c.json({ error: "Unauthorized" }, 401);

    // ensure user row for FK
    await db.insert(users).values({ wallet: body.wallet }).onConflictDoNothing();

    // store proposal (nonce unique prevents replay)
    try {
      const [created] = await db
        .insert(condProposals)
        .values({
          wallet: body.wallet,
          source: "gemini",
          action: body.action,
          params: body.params ?? {},
          reasoning: body.reasoning,
          confidence: body.confidence.toFixed(3),
          status: "pending",
          requestNonce: body.request_nonce,
          createdAt: new Date(),
        })
        .returning();

      await publishWalletEvent(body.wallet, {
        type: "COND_ACTION",
        data: {
          action: `proposal:${created.action}`,
          reasoning: created.reasoning,
          confidence: Number(created.confidence ?? "0.5"),
        },
      });

      return c.json({ ok: true, proposalId: created.id });
    } catch (err: any) {
      const isMissingTable =
        typeof err?.code === "string"
          ? err.code === "42P01"
          : typeof err?.message === "string" &&
            err.message.includes('relation "cond_proposals" does not exist');
      if (isMissingTable) {
        // Backwards-compatible: don't break deployments/tests that haven't migrated yet.
        // Proposal persistence will be enabled once 0007_cond_v2_proposals is migrated.
        await publishWalletEvent(body.wallet, {
          type: "COND_ACTION",
          data: {
            action: `proposal:${body.action}`,
            reasoning: body.reasoning,
            confidence: body.confidence,
          },
        });
        return c.json({
          ok: true,
          proposalId: null,
          warning: "cond_proposals_not_migrated",
        });
      }
      const message = typeof err?.message === "string" ? err.message : "";
      const isUniqueViolation =
        typeof err?.code === "string"
          ? err.code === "23505"
          : message.includes("duplicate key") ||
            message.includes("cond_proposals_request_nonce_idx");
      if (isUniqueViolation) {
        // idempotent: return latest pending proposal for this nonce if any
        const existing = await db
          .select({ id: condProposals.id })
          .from(condProposals)
          .where(eq(condProposals.requestNonce, body.request_nonce))
          .orderBy(desc(condProposals.createdAt))
          .limit(1);
        return c.json({ ok: true, proposalId: existing[0]?.id ?? null });
      }
      logger.error({ err }, "cond-proposal insert failed");
      return c.json({ error: "Failed to record proposal" }, 500);
    }
  },
);

export { app as internalRoutes };

