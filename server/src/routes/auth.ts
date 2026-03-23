import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '../shared/db.js';
import { users } from '../db/schema.js';
import { connectWalletSchema, refreshTokenSchema } from '../shared/types.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../shared/auth.js';
import { eq } from 'drizzle-orm';
import { logger } from '../shared/logger.js';

const app = new Hono();

// POST /api/auth/connect — wallet-based auth
app.post('/connect', zValidator('json', connectWalletSchema), async (c) => {
  const { wallet } = c.req.valid('json');

  try {
    // Upsert user
    await db.insert(users)
      .values({ wallet })
      .onConflictDoNothing();

    const accessToken = await generateAccessToken(wallet);
    const refreshToken = await generateRefreshToken(wallet);

    logger.info({ wallet }, 'Wallet connected');

    return c.json({
      accessToken,
      refreshToken,
      wallet,
    });
  } catch (err) {
    logger.error({ err, wallet }, 'Auth connect failed');
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// POST /api/auth/refresh — refresh access token
app.post('/refresh', zValidator('json', refreshTokenSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');

  try {
    const payload = await verifyRefreshToken(refreshToken);

    // Verify user still exists
    const user = await db.select()
      .from(users)
      .where(eq(users.wallet, payload.wallet))
      .limit(1);

    if (user.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const accessToken = await generateAccessToken(payload.wallet);

    return c.json({
      accessToken,
      wallet: payload.wallet,
    });
  } catch {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
});

export { app as authRoutes };
