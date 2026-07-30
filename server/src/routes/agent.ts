import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../shared/db.js";
import { authMiddleware } from "../shared/auth.js";
import {
  agentChatSchema,
  killSwitchSchema,
  updateMandateSchema,
} from "../shared/types.js";
import { condDecisions, mandates, positions, users } from "../db/schema.js";
import { logger } from "../shared/logger.js";
import { submitCondAction, runCondEvaluateForWallet } from "../shared/condEvaluate.js";
import { condProposals } from "../db/schema.js";
import {
  isCondExecutorEnabled,
  buildSetMandateTx,
  buildKillSwitchTx,
  executeCondAction,
  submitSignedTx,
} from "../shared/stellar.js";

const app = new Hono();

type RiskTolerance = "Conservative" | "Moderate" | "Aggressive";
type CreditRating = "AAA" | "AA" | "A" | "BBB";

const DEFAULT_MANDATE = {
  riskTolerance: "Moderate" as RiskTolerance,
  autoCompound: true,
  compoundThresholdCents: 5000,
  minCreditRating: "A" as CreditRating,
  paused: false,
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

function relativeTime(date: Date): string {
  const deltaMs = Date.now() - date.getTime();
  const minutes = Math.floor(deltaMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

app.use("*", authMiddleware);

app.get("/status", async (c) => {
  const wallet = c.get("wallet");

  try {
    await db.insert(users).values({ wallet }).onConflictDoNothing();

    const [mandateRow] = await db
      .select()
      .from(mandates)
      .where(eq(mandates.wallet, wallet))
      .limit(1);

    const holdings = await db
      .select({ principal: positions.principal, apyBps: positions.apyBps })
      .from(positions)
      .where(and(eq(positions.wallet, wallet), eq(positions.active, true)));

    const managedAssets = holdings.reduce(
      (sum, row) => sum + toNumber(row.principal),
      0,
    );

    const weightedApyTotal = holdings.reduce(
      (sum, row) => sum + toNumber(row.principal) * row.apyBps,
      0,
    );

    const avgApyBps =
      managedAssets > 0 ? Math.round(weightedApyTotal / managedAssets) : 0;
    const performanceBps = avgApyBps > 0 ? Math.max(0, avgApyBps - 450) : 0;

    const actions = await db
      .select({
        action: condDecisions.action,
        reasoning: condDecisions.reasoning,
        executed: condDecisions.executed,
        createdAt: condDecisions.createdAt,
      })
      .from(condDecisions)
      .where(eq(condDecisions.wallet, wallet))
      .orderBy(desc(condDecisions.createdAt))
      .limit(6);

    const activeMandate = {
      riskTolerance: mandateRow?.riskTolerance ?? DEFAULT_MANDATE.riskTolerance,
      autoCompound: mandateRow?.autoCompound ?? DEFAULT_MANDATE.autoCompound,
      compoundThresholdCents:
        mandateRow?.compoundThresholdCents ??
        DEFAULT_MANDATE.compoundThresholdCents,
      minCreditRating:
        mandateRow?.minCreditRating ?? DEFAULT_MANDATE.minCreditRating,
      paused: mandateRow?.paused ?? DEFAULT_MANDATE.paused,
      updatedAt:
        mandateRow?.updatedAt?.toISOString() ?? new Date().toISOString(),
    };

    return c.json({
      wallet,
      active: !activeMandate.paused,
      performanceBps,
      managedAssets,
      mandate: activeMandate,
      recentActions: actions.map((item) => ({
        action: item.action,
        reasoning: item.reasoning,
        executed: item.executed,
        time: relativeTime(item.createdAt),
      })),
    });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "Agent status fetch failed");
    return c.json({ error: err.message || "Failed to load agent status" }, 500);
  }
});

app.patch("/mandate", zValidator("json", updateMandateSchema), async (c) => {
  const wallet = c.get("wallet");
  const body = c.req.valid("json");

  try {
    await db.insert(users).values({ wallet }).onConflictDoNothing();

    await db
      .insert(mandates)
      .values({
        wallet,
        riskTolerance: (body.risk_tolerance ??
          DEFAULT_MANDATE.riskTolerance) as RiskTolerance,
        autoCompound: body.auto_compound ?? DEFAULT_MANDATE.autoCompound,
        compoundThresholdCents:
          body.compound_threshold_cents ??
          DEFAULT_MANDATE.compoundThresholdCents,
        minCreditRating: (body.min_credit_rating ??
          DEFAULT_MANDATE.minCreditRating) as CreditRating,
        paused: body.paused ?? DEFAULT_MANDATE.paused,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: mandates.wallet,
        set: {
          ...(body.risk_tolerance
            ? { riskTolerance: body.risk_tolerance as RiskTolerance }
            : {}),
          ...(body.auto_compound !== undefined
            ? { autoCompound: body.auto_compound }
            : {}),
          ...(body.compound_threshold_cents !== undefined
            ? { compoundThresholdCents: body.compound_threshold_cents }
            : {}),
          ...(body.min_credit_rating
            ? { minCreditRating: body.min_credit_rating as CreditRating }
            : {}),
          ...(body.paused !== undefined ? { paused: body.paused } : {}),
          updatedAt: new Date(),
        },
      });

    return c.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "Agent mandate update failed");
    return c.json({ error: err.message || "Failed to update mandate" }, 500);
  }
});

app.post("/kill-switch", zValidator("json", killSwitchSchema), async (c) => {
  const wallet = c.get("wallet");
  const { paused } = c.req.valid("json");

  try {
    await db.insert(users).values({ wallet }).onConflictDoNothing();

    await db
      .insert(mandates)
      .values({
        wallet,
        ...DEFAULT_MANDATE,
        paused,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: mandates.wallet,
        set: {
          paused,
          updatedAt: new Date(),
        },
      });

    return c.json({ ok: true, paused });
  } catch (err: any) {
    logger.error(
      { err: err.message, wallet },
      "Agent kill-switch update failed",
    );
    return c.json(
      { error: err.message || "Failed to toggle kill-switch" },
      500,
    );
  }
});

app.post("/evaluate", async (c) => {
  const wallet = c.get("wallet");

  try {
    const out = await runCondEvaluateForWallet(wallet);
    return c.json(out);
  } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : "";
    if (msg.includes("COND_HMAC_SECRET")) {
      return c.json(
        { error: "COND evaluation is not configured on this server" },
        503,
      );
    }
    logger.error({ err: err?.message, wallet }, "Agent evaluate failed");
    return c.json(
      { error: err?.message || "Failed to run COND evaluation" },
      500,
    );
  }
});

app.get("/proposals", async (c) => {
  const wallet = c.get("wallet");

  try {
    const rows = await db
      .select({
        id: condProposals.id,
        action: condProposals.action,
        reasoning: condProposals.reasoning,
        confidence: condProposals.confidence,
        status: condProposals.status,
        createdAt: condProposals.createdAt,
      })
      .from(condProposals)
      .where(eq(condProposals.wallet, wallet))
      .orderBy(desc(condProposals.createdAt))
      .limit(20);

    return c.json({
      wallet,
      proposals: rows.map((r) => ({
        id: r.id,
        action: r.action,
        reasoning: r.reasoning,
        confidence: r.confidence ? Number(r.confidence) : null,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    const isMissingTable =
      typeof err?.code === "string"
        ? err.code === "42P01"
        : typeof err?.message === "string" &&
          err.message.includes('relation "cond_proposals" does not exist');
    if (isMissingTable) {
      return c.json({ wallet, proposals: [], warning: "cond_proposals_not_migrated" });
    }
    logger.error({ err: err.message, wallet }, "Agent proposals fetch failed");
    return c.json(
      { error: err.message || "Failed to load proposals" },
      500,
    );
  }
});

app.post("/proposals/:id/approve", async (c) => {
  const wallet = c.get("wallet");
  const id = c.req.param("id");

  try {
    const [row] = await db
      .select()
      .from(condProposals)
      .where(and(eq(condProposals.id, id), eq(condProposals.wallet, wallet)))
      .limit(1);

    if (!row) return c.json({ error: "Proposal not found" }, 404);
    if (row.status !== "pending") {
      return c.json({ error: "Only pending proposals can be approved" }, 400);
    }

    await db
      .update(condProposals)
      .set({ status: "approved", decidedAt: new Date() })
      .where(eq(condProposals.id, id));

    const confidence =
      typeof row.confidence === "string" ? Number(row.confidence) : 0.5;
    const action = row.action;
    if (
      action !== "harvest" &&
      action !== "rebalance" &&
      action !== "rotate" &&
      action !== "notify"
    ) {
      return c.json({ error: "Unsupported proposal action" }, 400);
    }
    const result = await submitCondAction({
      wallet,
      action,
      params: (row.params ?? {}) as Record<string, unknown>,
      reasoning: row.reasoning,
      confidence: Number.isFinite(confidence) ? confidence : 0.5,
    });

    if (result.ok) {
      await db
        .update(condProposals)
        .set({ status: "submitted" })
        .where(eq(condProposals.id, id));
    }

    return c.json({ ok: true, id, status: result.ok ? "submitted" : "approved", submit: result });
  } catch (err: any) {
    const isMissingTable =
      typeof err?.code === "string"
        ? err.code === "42P01"
        : typeof err?.message === "string" &&
          err.message.includes('relation "cond_proposals" does not exist');
    if (isMissingTable) {
      return c.json({ error: "COND proposals are not migrated on this server yet" }, 503);
    }
    logger.error({ err: err.message, wallet, id }, "Approve proposal failed");
    return c.json({ error: err.message || "Failed to approve proposal" }, 500);
  }
});

app.post("/proposals/:id/deny", async (c) => {
  const wallet = c.get("wallet");
  const id = c.req.param("id");

  try {
    const [row] = await db
      .select()
      .from(condProposals)
      .where(and(eq(condProposals.id, id), eq(condProposals.wallet, wallet)))
      .limit(1);

    if (!row) return c.json({ error: "Proposal not found" }, 404);
    if (row.status !== "pending") {
      return c.json({ error: "Only pending proposals can be denied" }, 400);
    }

    await db
      .update(condProposals)
      .set({ status: "denied", decidedAt: new Date() })
      .where(eq(condProposals.id, id));

    return c.json({ ok: true, id, status: "denied" });
  } catch (err: any) {
    const isMissingTable =
      typeof err?.code === "string"
        ? err.code === "42P01"
        : typeof err?.message === "string" &&
          err.message.includes('relation "cond_proposals" does not exist');
    if (isMissingTable) {
      return c.json({ error: "COND proposals are not migrated on this server yet" }, 503);
    }
    logger.error({ err: err.message, wallet, id }, "Deny proposal failed");
    return c.json({ error: err.message || "Failed to deny proposal" }, 500);
  }
});

app.post("/chat", zValidator("json", agentChatSchema), async (c) => {
  const wallet = c.get("wallet");
  const { message } = c.req.valid("json");

  try {
    const [mandateRow] = await db
      .select({
        paused: mandates.paused,
        riskTolerance: mandates.riskTolerance,
      })
      .from(mandates)
      .where(eq(mandates.wallet, wallet))
      .limit(1);

    if (mandateRow?.paused) {
      return c.json({
        reply:
          "Kill-switch is active. I am monitoring only and will not recommend execution until you resume automation.",
        action: null,
      });
    }

    const normalized = message.toLowerCase();
    let action = "hold";
    let reasoning =
      "Current allocation is aligned with your mandate and risk controls.";

    if (normalized.includes("rebalance") || normalized.includes("rotate")) {
      action = "rebalance";
      reasoning =
        "A small rebalance can reduce concentration and keep duration risk inside your mandate.";
    } else if (normalized.includes("risk")) {
      action = "risk_review";
      reasoning =
        "Risk review suggests prioritizing higher-grade boxes until volatility normalizes.";
    } else if (normalized.includes("harvest")) {
      action = "harvest_review";
      reasoning =
        "Harvest is viable when pending yield exceeds your configured compound threshold.";
    }

    await db.insert(condDecisions).values({
      wallet,
      action,
      reasoning,
      executed: false,
    });

    return c.json({
      reply: `COND analysis: ${reasoning}`,
      action,
      mandateRisk: mandateRow?.riskTolerance ?? DEFAULT_MANDATE.riskTolerance,
    });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "Agent chat failed");
    return c.json(
      { error: err.message || "Failed to process agent chat" },
      500,
    );
  }
});

// ── On-chain COND: bounded mandate + auditable execution ─────────────────────

// POST /api/agent/mandate/build — user sets on-chain APY bounds (min/max bps).
app.post("/mandate/build", authMiddleware, async (c) => {
  try {
    if (!isCondExecutorEnabled()) {
      return c.json({ error: "On-chain COND executor is not enabled" }, 400);
    }
    const wallet = c.get("wallet");
    const { min_apy_bps, max_apy_bps } = await c.req.json();
    if (min_apy_bps === undefined || max_apy_bps === undefined) {
      return c.json(
        { error: "Missing required fields: min_apy_bps, max_apy_bps" },
        400,
      );
    }
    const { xdr, networkPassphrase } = await buildSetMandateTx(
      wallet,
      Number(min_apy_bps),
      Number(max_apy_bps),
    );
    return c.json({ xdr, networkPassphrase });
  } catch (err: any) {
    logger.error({ err: err.message }, "Mandate build failed");
    return c.json({ error: err.message || "Failed to build mandate" }, 500);
  }
});

// POST /api/agent/kill-switch/build — user pauses/resumes agent activity on-chain.
app.post("/kill-switch/build", authMiddleware, async (c) => {
  try {
    if (!isCondExecutorEnabled()) {
      return c.json({ error: "On-chain COND executor is not enabled" }, 400);
    }
    const wallet = c.get("wallet");
    const { engaged } = await c.req.json();
    const { xdr, networkPassphrase } = await buildKillSwitchTx(
      wallet,
      Boolean(engaged),
    );
    return c.json({ xdr, networkPassphrase });
  } catch (err: any) {
    logger.error({ err: err.message }, "Kill-switch build failed");
    return c.json({ error: err.message || "Failed to build kill switch" }, 500);
  }
});

// POST /api/agent/onchain/submit — submit a signed mandate/kill-switch tx.
app.post("/onchain/submit", authMiddleware, async (c) => {
  try {
    const { signedXdr } = await c.req.json();
    if (!signedXdr) {
      return c.json({ error: "Missing required field: signedXdr" }, 400);
    }
    const { txHash } = await submitSignedTx(signedXdr);
    return c.json({ ok: true, txHash });
  } catch (err: any) {
    logger.error({ err: err.message }, "Agent on-chain submit failed");
    return c.json({ error: "Transaction rejected: " + err.message }, 400);
  }
});

// POST /api/agent/execute — operator executes a mandate-checked action on-chain
// for the caller. Reverts on-chain if outside mandate or kill switch is engaged.
app.post("/execute", authMiddleware, async (c) => {
  try {
    if (!isCondExecutorEnabled()) {
      return c.json({ error: "On-chain COND executor is not enabled" }, 400);
    }
    const wallet = c.get("wallet");
    const { box_id, reason, confidence } = await c.req.json();
    if (!box_id) {
      return c.json({ error: "Missing required field: box_id" }, 400);
    }
    const { txHash } = await executeCondAction(
      wallet,
      box_id,
      reason ?? "agent action",
      Number(confidence ?? 0),
    );
    return c.json({ ok: true, txHash });
  } catch (err: any) {
    logger.error({ err: err.message }, "On-chain COND execute failed");
    return c.json(
      { error: err.message || "Execution rejected (mandate / kill switch)" },
      400,
    );
  }
});

export { app as agentRoutes };
