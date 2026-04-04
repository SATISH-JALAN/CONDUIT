import { app } from "./app.js";
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
