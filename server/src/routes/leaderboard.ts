import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  getLeaderboardSnapshot,
  type LeaderboardPeriod,
} from "../shared/leaderboard.js";
import { db } from "../shared/db.js";
import { portfolioCopies } from "../db/schema.js";
import { leaderboardQuerySchema } from "../shared/types.js";
import { logger } from "../shared/logger.js";

const app = new Hono();

// GET /api/leaderboard?period=7d&limit=50
app.get("/", zValidator("query", leaderboardQuerySchema), async (c) => {
  try {
    const { period, limit } = c.req.valid("query");
    const leaderboard = await getLeaderboardSnapshot(
      period as LeaderboardPeriod,
      limit,
    );

    const wallets = leaderboard.entries.map((entry) => entry.wallet);
    const followersByWallet = new Map<string, number>();

    if (wallets.length > 0) {
      try {
        const followerCounts = await db
          .select({
            leaderWallet: portfolioCopies.leaderWallet,
            followers: sql<number>`count(*)::int`,
          })
          .from(portfolioCopies)
          .where(
            and(
              inArray(portfolioCopies.leaderWallet, wallets),
              eq(portfolioCopies.active, true),
            ),
          )
          .groupBy(portfolioCopies.leaderWallet);

        for (const row of followerCounts) {
          followersByWallet.set(row.leaderWallet, row.followers);
        }
      } catch (enrichErr: any) {
        logger.warn(
          { err: enrichErr.message },
          "Leaderboard social enrichment skipped",
        );
      }
    }

    return c.json({
      ...leaderboard,
      entries: leaderboard.entries.map((entry) => ({
        ...entry,
        badge:
          entry.rank === 1
            ? "Legend"
            : entry.rank <= 3
              ? "Elite"
              : entry.rank <= 10
                ? "Rising"
                : "Contender",
        copiedBy: followersByWallet.get(entry.wallet) ?? 0,
      })),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Leaderboard fetch failed");
    return c.json({ error: err.message || "Failed to load leaderboard" }, 500);
  }
});

export { app as leaderboardRoutes };
