import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { boxRoutes } from "./routes/boxes.js";
import { positionRoutes } from "./routes/position.js";
import { depositRoutes } from "./routes/deposit.js";
import { harvestRoutes } from "./routes/harvest.js";
import { splitRoutes } from "./routes/split.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";
import { raceRoutes } from "./routes/race.js";
import { agentRoutes } from "./routes/agent.js";
import { nftRoutes } from "./routes/nfts.js";
import { socialRoutes } from "./routes/social.js";

// ── App ──
export const app = new Hono().basePath("/api");

// ── Middleware ──
app.use(
  "*",
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use("*", honoLogger());

// ── Routes ──
app.route("/health", healthRoutes);
app.route("/auth", authRoutes);
app.route("/boxes", boxRoutes);
app.route("/position", positionRoutes);
app.route("/deposit", depositRoutes);
app.route("/harvest", harvestRoutes);
app.route("/split", splitRoutes);
app.route("/leaderboard", leaderboardRoutes);
app.route("/race", raceRoutes);
app.route("/agent", agentRoutes);
app.route("/nfts", nftRoutes);
app.route("/social", socialRoutes);
