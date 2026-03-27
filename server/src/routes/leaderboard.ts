import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  getLeaderboardSnapshot,
  type LeaderboardPeriod,
} from "../shared/leaderboard.js";
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
    return c.json(leaderboard);
  } catch (err: any) {
    logger.error({ err: err.message }, "Leaderboard fetch failed");
    return c.json({ error: err.message || "Failed to load leaderboard" }, 500);
  }
});

export { app as leaderboardRoutes };
