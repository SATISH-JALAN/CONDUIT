import { Hono } from 'hono';
import { db } from '../shared/db.js';
import { redis } from '../shared/redis.js';
import { sql } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
  const checks: Record<string, string> = {
    server: 'ok',
    database: 'unknown',
    redis: 'unknown',
  };

  // Check Postgres
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = 'ok';
  } catch {
    checks.database = 'unreachable';
  }

  // Check Redis
  try {
    const pong = await redis.ping();
    checks.redis = pong === 'PONG' ? 'ok' : 'unexpected';
  } catch {
    checks.redis = 'unreachable';
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');

  return c.json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }, healthy ? 200 : 503);
});

export { app as healthRoutes };
