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
import { logger } from "./shared/logger.js";
import { redis } from "./shared/redis.js";
import type { ServerWebSocket } from "bun";

// ── Types ──
interface WSData {
  wallet: string;
}

// ── App ──
const app = new Hono().basePath("/api"); // switch to testnet

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

// ── WebSocket upgrade map (used by Bun.serve) ──
const wsClients = new Map<string, Set<ServerWebSocket<WSData>>>();

// ── Start ──
const PORT = parseInt(process.env.PORT || "5000");

const server = Bun.serve<WSData>({
  port: PORT,
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

logger.info({ port: PORT }, "🚀 Conduit server running");

// ── Graceful shutdown ──
process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  redis.disconnect();
  server.stop();
  process.exit(0);
});

export { wsClients, server };
