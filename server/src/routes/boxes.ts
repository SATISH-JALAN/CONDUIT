import { Hono } from 'hono';
import { db } from '../shared/db.js';
import { bondBoxes } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const app = new Hono();

// GET /api/boxes — all active bond boxes
app.get('/', async (c) => {
  const boxes = await db.select().from(bondBoxes).where(eq(bondBoxes.active, true));

  // Transform DB format to API format
  const result = boxes.map((box) => ({
    id: box.id,
    name: box.name,
    description: box.description,
    risk: box.risk,
    apy: box.apyBps / 100, // 520 → 5.2
    duration: box.durationYears,
    min: box.minInvestment / 100, // cents → dollars
    type: box.assetType,
    flag: box.flag,
    accentColor: box.accentColor,
  }));

  return c.json(result);
});

// GET /api/boxes/:id — single box detail
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const box = await db.select()
    .from(bondBoxes)
    .where(eq(bondBoxes.id, id))
    .limit(1);

  if (box.length === 0) {
    return c.json({ error: 'Bond box not found' }, 404);
  }

  const b = box[0];
  return c.json({
    id: b.id,
    name: b.name,
    description: b.description,
    risk: b.risk,
    apy: b.apyBps / 100,
    duration: b.durationYears,
    min: b.minInvestment / 100,
    type: b.assetType,
    flag: b.flag,
    accentColor: b.accentColor,
    contractId: b.contractId,
    createdAt: b.createdAt,
  });
});

export { app as boxRoutes };
