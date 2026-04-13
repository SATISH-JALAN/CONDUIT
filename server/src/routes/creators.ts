import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../shared/db.js";
import { authMiddleware } from "../shared/auth.js";
import { creatorPoolJoinSchema } from "../shared/types.js";
import { bondBoxes, creatorPoolMemberships, creatorPools, users } from "../db/schema.js";
import { logger } from "../shared/logger.js";

const app = new Hono();

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

// GET /api/creators/pools — public list (demo-friendly)
app.get("/pools", async (c) => {
  try {
    const rows = await db
      .select({
        id: creatorPools.id,
        name: creatorPools.name,
        handle: creatorPools.handle,
        creatorWallet: creatorPools.creatorWallet,
        boxId: creatorPools.boxId,
        creatorShareBps: creatorPools.creatorShareBps,
        fanApyHintBps: creatorPools.fanApyHintBps,
        tone: creatorPools.tone,
        blurb: creatorPools.blurb,
        createdAt: creatorPools.createdAt,
        boxName: bondBoxes.name,
        boxRisk: bondBoxes.risk,
        boxApyBps: bondBoxes.apyBps,
        followers: sql<number>`count(distinct ${creatorPoolMemberships.fanWallet})::int`,
        tvl: sql<string>`coalesce(sum(${creatorPoolMemberships.depositAmount}), 0)::text`,
      })
      .from(creatorPools)
      .innerJoin(bondBoxes, eq(creatorPools.boxId, bondBoxes.id))
      .leftJoin(
        creatorPoolMemberships,
        eq(creatorPoolMemberships.poolId, creatorPools.id),
      )
      .where(eq(creatorPools.active, true))
      .groupBy(creatorPools.id, bondBoxes.id)
      .orderBy(desc(creatorPools.createdAt));

    return c.json({
      pools: rows.map((r) => ({
        id: r.id,
        name: r.name,
        handle: r.handle,
        creatorWallet: r.creatorWallet,
        creatorShareBps: r.creatorShareBps,
        tone: r.tone,
        blurb: r.blurb,
        box: {
          id: r.boxId,
          name: r.boxName,
          risk: r.boxRisk,
          apyBps: r.boxApyBps,
        },
        followers: r.followers ?? 0,
        tvl: toNumber(r.tvl),
        fanApyHintBps: r.fanApyHintBps,
      })),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Creator pools list failed");
    return c.json({ error: err.message || "Failed to load creator pools" }, 500);
  }
});

// GET /api/creators/pools/:id — public detail
app.get("/pools/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const rows = await db
      .select({
        id: creatorPools.id,
        name: creatorPools.name,
        handle: creatorPools.handle,
        creatorWallet: creatorPools.creatorWallet,
        boxId: creatorPools.boxId,
        creatorShareBps: creatorPools.creatorShareBps,
        fanApyHintBps: creatorPools.fanApyHintBps,
        tone: creatorPools.tone,
        blurb: creatorPools.blurb,
        createdAt: creatorPools.createdAt,
        boxName: bondBoxes.name,
        boxRisk: bondBoxes.risk,
        boxApyBps: bondBoxes.apyBps,
        followers: sql<number>`count(distinct ${creatorPoolMemberships.fanWallet})::int`,
        tvl: sql<string>`coalesce(sum(${creatorPoolMemberships.depositAmount}), 0)::text`,
      })
      .from(creatorPools)
      .innerJoin(bondBoxes, eq(creatorPools.boxId, bondBoxes.id))
      .leftJoin(
        creatorPoolMemberships,
        eq(creatorPoolMemberships.poolId, creatorPools.id),
      )
      .where(and(eq(creatorPools.id, id), eq(creatorPools.active, true)))
      .groupBy(creatorPools.id, bondBoxes.id)
      .limit(1);

    if (!rows[0]) {
      return c.json({ error: "Creator pool not found" }, 404);
    }

    const r = rows[0];
    return c.json({
      pool: {
        id: r.id,
        name: r.name,
        handle: r.handle,
        creatorWallet: r.creatorWallet,
        creatorShareBps: r.creatorShareBps,
        tone: r.tone,
        blurb: r.blurb,
        box: {
          id: r.boxId,
          name: r.boxName,
          risk: r.boxRisk,
          apyBps: r.boxApyBps,
        },
        followers: r.followers ?? 0,
        tvl: toNumber(r.tvl),
        fanApyHintBps: r.fanApyHintBps,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message, id }, "Creator pool detail failed");
    return c.json({ error: err.message || "Failed to load creator pool" }, 500);
  }
});

// ── Authenticated fan actions ──
app.use("/pools/:id/*", authMiddleware);

// POST /api/creators/pools/:id/join — record fan membership (demo/off-chain)
app.post("/pools/:id/join", zValidator("json", creatorPoolJoinSchema), async (c) => {
  const id = c.req.param("id");
  const wallet = c.get("wallet");
  const { deposit_amount } = c.req.valid("json");

  try {
    // Ensure pool exists
    const pool = await db
      .select({ id: creatorPools.id })
      .from(creatorPools)
      .where(and(eq(creatorPools.id, id), eq(creatorPools.active, true)))
      .limit(1);
    if (!pool[0]) {
      return c.json({ error: "Creator pool not found" }, 404);
    }

    await db.insert(users).values({ wallet }).onConflictDoNothing();

    await db
      .insert(creatorPoolMemberships)
      .values({
        poolId: id,
        fanWallet: wallet,
        depositAmount: deposit_amount.toFixed(7),
      })
      .onConflictDoUpdate({
        target: [creatorPoolMemberships.poolId, creatorPoolMemberships.fanWallet],
        set: {
          depositAmount: sql`${creatorPoolMemberships.depositAmount} + ${deposit_amount.toFixed(7)}`,
        },
      });

    return c.json({ ok: true, poolId: id });
  } catch (err: any) {
    logger.error({ err: err.message, id, wallet }, "Creator pool join failed");
    return c.json({ error: err.message || "Failed to join creator pool" }, 500);
  }
});

export { app as creatorRoutes };

