import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware, verifyAccessToken } from "../shared/auth.js";
import { getActiveRaceView, joinRace } from "../shared/leaderboard.js";
import { raceJoinSchema } from "../shared/types.js";
import { logger } from "../shared/logger.js";

const app = new Hono();

async function resolveWalletFromAuthHeader(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  try {
    const payload = await verifyAccessToken(authHeader.slice(7));
    return payload.wallet;
  } catch {
    return null;
  }
}

// GET /api/race/active
app.get("/active", async (c) => {
  try {
    const wallet = await resolveWalletFromAuthHeader(
      c.req.header("Authorization"),
    );
    const race = await getActiveRaceView(wallet ?? undefined);
    return c.json(race);
  } catch (err: any) {
    logger.error({ err: err.message }, "Active race fetch failed");
    return c.json({ error: err.message || "Failed to load active race" }, 500);
  }
});

// POST /api/race/join
app.post(
  "/join",
  authMiddleware,
  zValidator("json", raceJoinSchema),
  async (c) => {
    try {
      const wallet = c.get("wallet");
      const { raceId } = c.req.valid("json");

      const result = await joinRace(wallet, raceId);

      return c.json({
        ok: true,
        joined: result.joined,
        race: result.race,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "Join race failed");

      if (err.message === "Race not found") {
        return c.json({ error: err.message }, 404);
      }

      if (err.message === "Race is not active") {
        return c.json({ error: err.message }, 400);
      }

      return c.json({ error: err.message || "Failed to join race" }, 500);
    }
  },
);

export { app as raceRoutes };
