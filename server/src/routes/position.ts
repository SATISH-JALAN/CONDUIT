import { Hono } from 'hono';
import { getAllAnchors, seedDemoAnchors } from '../stream/cache.js';
import { calculateValue, calculatePendingYield, yieldPerSecond, yieldPerDay } from '../stream/formula.js';
import type { Anchor } from '../stream/formula.js';

const app = new Hono();

// GET /api/position/:wallet — get aggregated position data
app.get('/:wallet', async (c) => {
  const wallet = c.req.param('wallet');
  const anchors = await getAllAnchors(wallet);

  if (anchors.length === 0) {
    return c.json({
      wallet,
      totalValue: 0,
      totalPrincipal: 0,
      pendingYield: 0,
      yieldPerSecond: 0,
      yieldPerDay: 0,
      avgApyBps: 0,
      positions: [],
    });
  }

  const now = Date.now();
  let totalPrincipal = 0;
  let totalValue = 0;
  let totalYieldPerSec = 0;
  let weightedApy = 0;

  const positions = anchors.map((anchor: Anchor) => {
    const value = calculateValue(anchor, now);
    const pending = calculatePendingYield(anchor, now);
    const perSec = yieldPerSecond(anchor);
    const perDay = yieldPerDay(anchor);

    totalPrincipal += anchor.principal;
    totalValue += value;
    totalYieldPerSec += perSec;
    weightedApy += anchor.apy_bps * anchor.principal;

    return {
      box_id: anchor.box_id,
      principal: anchor.principal,
      apy_bps: anchor.apy_bps,
      apy: anchor.apy_bps / 100,
      sync_ts: anchor.sync_ts,
      currentValue: Math.round(value * 10000) / 10000,
      pendingYield: Math.round(pending * 10000) / 10000,
      yieldPerSecond: perSec,
      yieldPerDay: perDay,
    };
  });

  const avgApyBps = totalPrincipal > 0 ? Math.round(weightedApy / totalPrincipal) : 0;

  return c.json({
    wallet,
    totalValue: Math.round(totalValue * 10000) / 10000,
    totalPrincipal,
    pendingYield: Math.round((totalValue - totalPrincipal) * 10000) / 10000,
    yieldPerSecond: totalYieldPerSec,
    yieldPerDay: totalYieldPerSec * 86400,
    avgApyBps,
    avgApy: avgApyBps / 100,
    positions,
  });
});

// POST /api/position/seed-demo — seed demo data (dev only)
app.post('/seed-demo', async (c) => {
  await seedDemoAnchors();
  return c.json({ ok: true, message: 'Demo anchors seeded' });
});

export { app as positionRoutes };
