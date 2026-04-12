import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../shared/db.js";
import { condDecisions, internalTxAudits, mandates, users } from "../db/schema.js";
import { internalTxRequestSchema } from "../shared/types.js";
import { verifyHmacHex } from "../shared/hmac.js";
import { eq } from "drizzle-orm";
import { logger } from "../shared/logger.js";
import { publishWalletEvent } from "../shared/redis.js";

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

export { app as internalRoutes };

