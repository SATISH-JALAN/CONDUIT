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

export { app as agentRoutes };
