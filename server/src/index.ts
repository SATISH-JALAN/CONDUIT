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
import { logger } from "./shared/logger.js";
import { redis } from "./shared/redis.js";
import {
  startLeaderboardJob,
  stopLeaderboardJob,
} from "./shared/leaderboard.js";
import type { ServerWebSocket } from "bun";

// ── Types ──
interface WSData {
  wallet: string;
}

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

const DEFAULT_CLIENT_ORIGIN = "http://localhost:3000";
const configuredClientOrigins = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  DEFAULT_CLIENT_ORIGIN
)
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const allowVercelPreviews =
  process.env.CLIENT_URL_ALLOW_VERCEL_PREVIEWS !== "false";

function isAllowedOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin);

  if (configuredClientOrigins.includes(normalized)) {
    return true;
  }

  if (
    allowVercelPreviews &&
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)
  ) {
    return true;
  }

  return false;
}

// ── App ──
const app = new Hono().basePath("/api"); // switch to testnet

// ── Middleware ──
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) {
        return configuredClientOrigins[0] || DEFAULT_CLIENT_ORIGIN;
      }

      return isAllowedOrigin(origin) ? origin : "";
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
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

// ── WebSocket upgrade map (used by Bun.serve) ──
const wsClients = new Map<string, Set<ServerWebSocket<WSData>>>();

// ── Start ──
const port = Number(process.env.PORT) || 5000;

const server = Bun.serve<WSData>({
  port,
  hostname: "0.0.0.0",
  fetch: app.fetch,
  websocket: {
    open(ws: ServerWebSocket<WSData>) {
      const wallet = ws.data?.wallet || "anonymous";
      if (!wsClients.has(wallet)) wsClients.set(wallet, new Set());
      wsClients.get(wallet)!.add(ws);
      logger.info({ wallet }, "WS connected");
    },
    message(ws: ServerWebSocket<WSData>, message: string | Buffer) {
      if (message === "PING") {
        ws.send("PONG");
      }
    },
    close(ws: ServerWebSocket<WSData>) {
      const wallet = ws.data?.wallet || "anonymous";
      wsClients.get(wallet)?.delete(ws);
      if (wsClients.get(wallet)?.size === 0) wsClients.delete(wallet);
      logger.info({ wallet }, "WS disconnected");
    },
  },
});

logger.info({ port }, "🚀 Conduit server running");
startLeaderboardJob();

// ── Graceful shutdown ──
process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  stopLeaderboardJob();
  redis.disconnect();
  server.stop();
  process.exit(0);
});

export { wsClients, server };
