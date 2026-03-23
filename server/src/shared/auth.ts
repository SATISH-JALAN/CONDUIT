import { SignJWT, jwtVerify } from 'jose';
import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'conduit-dev-jwt-secret-change-in-production');
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'conduit-dev-refresh-secret-change-in-production');

export interface JWTPayload {
  wallet: string;
  iat: number;
  exp: number;
}

// ── Token Generation ──

export async function generateAccessToken(wallet: string): Promise<string> {
  return new SignJWT({ wallet })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(wallet: string): Promise<string> {
  return new SignJWT({ wallet })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_REFRESH_SECRET);
}

// ── Token Verification ──

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as unknown as JWTPayload;
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
  return payload as unknown as JWTPayload;
}

// ── Auth Middleware ──

// Extends Hono context with wallet from JWT
type AuthEnv = {
  Variables: {
    wallet: string;
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token);
    c.set('wallet', payload.wallet);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});
