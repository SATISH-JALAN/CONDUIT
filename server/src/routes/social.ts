import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../shared/db.js";
import { authMiddleware } from "../shared/auth.js";
import { copyPortfolioSchema, stellarAddressSchema } from "../shared/types.js";
import { leaderboardCache, portfolioCopies, users } from "../db/schema.js";
import { logger } from "../shared/logger.js";

const app = new Hono();

function parseCsvWallets(input: string | undefined): string[] {
  if (!input) return [];

  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => stellarAddressSchema.safeParse(item).success);
}

app.use("*", authMiddleware);

app.get("/copying", async (c) => {
  const wallet = c.get("wallet");

  try {
    const rows = await db
      .select({
        leaderWallet: portfolioCopies.leaderWallet,
        active: portfolioCopies.active,
        updatedAt: portfolioCopies.updatedAt,
      })
      .from(portfolioCopies)
      .where(eq(portfolioCopies.followerWallet, wallet))
      .orderBy(desc(portfolioCopies.updatedAt));

    return c.json({
      wallet,
      leaders: rows,
    });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "Copying list fetch failed");
    return c.json(
      { error: err.message || "Failed to load copied portfolios" },
      500,
    );
  }
});

app.get("/status", async (c) => {
  const wallet = c.get("wallet");

  try {
    const leaders = parseCsvWallets(c.req.query("leaders"));

    if (leaders.length === 0) {
      return c.json({ following: {} });
    }

    const rows = await db
      .select({
        leaderWallet: portfolioCopies.leaderWallet,
        active: portfolioCopies.active,
      })
      .from(portfolioCopies)
      .where(
        and(
          eq(portfolioCopies.followerWallet, wallet),
          inArray(portfolioCopies.leaderWallet, leaders),
        ),
      );

    const following = Object.fromEntries(
      leaders.map((leader) => [leader, false]),
    );
    for (const row of rows) {
      following[row.leaderWallet] = row.active;
    }

    return c.json({ following });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "Follow status fetch failed");
    return c.json(
      { error: err.message || "Failed to load follow status" },
      500,
    );
  }
});

app.post("/copy", zValidator("json", copyPortfolioSchema), async (c) => {
  const wallet = c.get("wallet");
  const { leader_wallet } = c.req.valid("json");

  try {
    if (leader_wallet === wallet) {
      return c.json({ error: "Cannot copy your own portfolio" }, 400);
    }

    await db.insert(users).values({ wallet }).onConflictDoNothing();
    await db
      .insert(users)
      .values({ wallet: leader_wallet })
      .onConflictDoNothing();

    await db
      .insert(portfolioCopies)
      .values({
        followerWallet: wallet,
        leaderWallet: leader_wallet,
        active: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [portfolioCopies.followerWallet, portfolioCopies.leaderWallet],
        set: {
          active: true,
          updatedAt: new Date(),
        },
      });

    return c.json({ ok: true, leaderWallet: leader_wallet, active: true });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "Copy portfolio failed");
    return c.json({ error: err.message || "Failed to copy portfolio" }, 500);
  }
});

app.delete("/copy/:leaderWallet", async (c) => {
  const wallet = c.get("wallet");
  const leaderWallet = c.req.param("leaderWallet");

  try {
    if (!stellarAddressSchema.safeParse(leaderWallet).success) {
      return c.json({ error: "Invalid leader wallet" }, 400);
    }

    await db
      .update(portfolioCopies)
      .set({ active: false, updatedAt: new Date() })
      .where(
        and(
          eq(portfolioCopies.followerWallet, wallet),
          eq(portfolioCopies.leaderWallet, leaderWallet),
        ),
      );

    return c.json({ ok: true, leaderWallet, active: false });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "Unfollow portfolio failed");
    return c.json(
      { error: err.message || "Failed to unfollow portfolio" },
      500,
    );
  }
});

app.get("/leaders", async (c) => {
  try {
    const latest = await db
      .select({ computedAt: leaderboardCache.computedAt })
      .from(leaderboardCache)
      .where(eq(leaderboardCache.period, "7d"))
      .orderBy(desc(leaderboardCache.computedAt))
      .limit(1);

    if (!latest[0]) {
      return c.json({ leaders: [] });
    }

    const rows = await db
      .select({
        wallet: leaderboardCache.wallet,
        rank: leaderboardCache.rank,
        apyBps: leaderboardCache.apyBps,
        tvl: leaderboardCache.tvl,
      })
      .from(leaderboardCache)
      .where(
        and(
          eq(leaderboardCache.period, "7d"),
          eq(leaderboardCache.computedAt, latest[0].computedAt),
        ),
      )
      .orderBy(leaderboardCache.rank)
      .limit(50);

    if (rows.length === 0) {
      return c.json({ leaders: [] });
    }

    const leaderWallets = rows.map((row) => row.wallet);

    const followerCounts = await db
      .select({
        leaderWallet: portfolioCopies.leaderWallet,
        followers: sql<number>`count(*)::int`,
      })
      .from(portfolioCopies)
      .where(
        and(
          inArray(portfolioCopies.leaderWallet, leaderWallets),
          eq(portfolioCopies.active, true),
        ),
      )
      .groupBy(portfolioCopies.leaderWallet);

    const followersByLeader = new Map(
      followerCounts.map((row) => [row.leaderWallet, row.followers]),
    );

    return c.json({
      leaders: rows.map((row) => ({
        wallet: row.wallet,
        rank: row.rank,
        apy: row.apyBps / 100,
        tvl: Number.parseFloat(String(row.tvl)),
        followers: followersByLeader.get(row.wallet) ?? 0,
      })),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Social leaders fetch failed");
    return c.json(
      { error: err.message || "Failed to load social leaders" },
      500,
    );
  }
});

export { app as socialRoutes };
