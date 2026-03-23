import { redis } from '../shared/redis.js';
import type { Anchor } from './formula.js';
import { logger } from '../shared/logger.js';

const ANCHOR_PREFIX = 'conduit:anchor:';

/**
 * Get anchor for a wallet from Redis
 */
export async function getAnchor(wallet: string, boxId?: string): Promise<Anchor | null> {
  const key = boxId ? `${ANCHOR_PREFIX}${wallet}:${boxId}` : `${ANCHOR_PREFIX}${wallet}`;
  const raw = await redis.get(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Anchor;
  } catch {
    logger.warn({ wallet, key }, 'Invalid anchor data in Redis');
    return null;
  }
}

/**
 * Set anchor for a wallet in Redis
 */
export async function setAnchor(wallet: string, anchor: Anchor): Promise<void> {
  const key = `${ANCHOR_PREFIX}${wallet}:${anchor.box_id}`;
  await redis.set(key, JSON.stringify(anchor));
  logger.debug({ wallet, box_id: anchor.box_id }, 'Anchor updated');
}

/**
 * Get all anchors for a wallet (across all boxes)
 */
export async function getAllAnchors(wallet: string): Promise<Anchor[]> {
  const pattern = `${ANCHOR_PREFIX}${wallet}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.get(key);
  }

  const results = await pipeline.exec();
  if (!results) return [];

  const anchors: Anchor[] = [];
  for (const [err, raw] of results) {
    if (!err && raw) {
      try {
        anchors.push(JSON.parse(raw as string));
      } catch { /* skip invalid */ }
    }
  }

  return anchors;
}

/**
 * Seed demo anchors for testing
 */
export async function seedDemoAnchors(): Promise<void> {
  const demoWallet = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

  const demoAnchors: Anchor[] = [
    {
      principal: 20000,
      apy_bps: 420,
      sync_ts: Date.now() / 1000,
      box_id: 'us-treasury-10y',
    },
    {
      principal: 15000,
      apy_bps: 510,
      sync_ts: Date.now() / 1000,
      box_id: 'ondo-usdy',
    },
    {
      principal: 10000,
      apy_bps: 384,
      sync_ts: Date.now() / 1000,
      box_id: 'german-bund-2027',
    },
    {
      principal: 5000,
      apy_bps: 650,
      sync_ts: Date.now() / 1000,
      box_id: 'corporate-bond-a',
    },
  ];

  for (const anchor of demoAnchors) {
    await setAnchor(demoWallet, anchor);
  }

  logger.info({ wallet: demoWallet, count: demoAnchors.length }, 'Demo anchors seeded');
}
