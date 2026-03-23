import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { logger } from './shared/logger.js';
import { redis } from './shared/redis.js';

// ── App ──
const app = new Hono().basePath('/api');

// ── Middleware ──
app.use('*', cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use('*', honoLogger());

// ── Routes ──
app.route('/health', healthRoutes);
app.route('/auth', authRoutes);

// ── WebSocket upgrade map (used by Bun.serve) ──
const wsClients = new Map<string, Set<ServerWebSocket<{ wallet: string }>>>();

// ── Start ──
const PORT = parseInt(process.env.PORT || '5000');

const server = Bun.serve({
  port: PORT,
  fetch: app.fetch,
  websocket: {
    open(ws) {
      const wallet = ws.data?.wallet || 'anonymous';
      if (!wsClients.has(wallet)) wsClients.set(wallet, new Set());
      wsClients.get(wallet)!.add(ws);
      logger.info({ wallet }, 'WS connected');
    },
    message(ws, message) {
      // Handle PING/PONG keepalive
      if (message === 'PING') {
        ws.send('PONG');
      }
    },
    close(ws) {
      const wallet = ws.data?.wallet || 'anonymous';
      wsClients.get(wallet)?.delete(ws);
      if (wsClients.get(wallet)?.size === 0) wsClients.delete(wallet);
      logger.info({ wallet }, 'WS disconnected');
    },
  },
});

logger.info({ port: PORT }, '🚀 Conduit server running');

// ── Graceful shutdown ──
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  redis.disconnect();
  server.stop();
  process.exit(0);
});

export { wsClients, server };
export type { ServerWebSocket } from 'bun';
