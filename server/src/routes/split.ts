import { Hono } from "hono";
import { db } from "../shared/db.js";
import { splitConfigs, users } from "../db/schema.js";
import { logger } from "../shared/logger.js";
import {
  saveSplitConfigSchema,
  stellarAddressSchema,
} from "../shared/types.js";
import { verifyAccessToken } from "../shared/auth.js";
import { eq } from "drizzle-orm";

const app = new Hono();

function defaultSplit(wallet: string) {
  return [{ destination: wallet, percentage: 100, label: "Wallet" }];
}

async function resolveWallet(
  authHeader: string | undefined,
  fallbackWallet?: string,
): Promise<string | null> {
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      return payload.wallet;
    } catch {
      // Fall back to explicit wallet below.
    }
  }

  if (fallbackWallet) {
    const parsed = stellarAddressSchema.safeParse(fallbackWallet);
    if (parsed.success) return parsed.data;
  }

  return null;
}

// GET /api/split/:wallet
app.get("/:wallet", async (c) => {
  const wallet = c.req.param("wallet");
  const walletResult = stellarAddressSchema.safeParse(wallet);

  if (!walletResult.success) {
    return c.json({ error: "Invalid wallet address" }, 400);
  }

  try {
    const [row] = await db
      .select({ splits: splitConfigs.splits })
      .from(splitConfigs)
      .where(eq(splitConfigs.wallet, wallet))
      .limit(1);

    return c.json({
      wallet,
      splits: row?.splits ?? defaultSplit(wallet),
    });
  } catch (err: any) {
    logger.error({ err: err.message, wallet }, "Split config fetch failed");
    return c.json({ error: err.message || "Failed to load split config" }, 500);
  }
});

// POST /api/split
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = saveSplitConfigSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0].message }, 400);
    }

    const wallet = await resolveWallet(
      c.req.header("Authorization"),
      parsed.data.wallet,
    );
    if (!wallet) {
      return c.json({ error: "Missing wallet context" }, 401);
    }

    const splits = parsed.data.splits;

    await db.insert(users).values({ wallet }).onConflictDoNothing();

    await db
      .insert(splitConfigs)
      .values({
        wallet,
        splits,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: splitConfigs.wallet,
        set: {
          splits,
          updatedAt: new Date(),
        },
      });

    logger.info({ wallet, splitCount: splits.length }, "Split config saved");

    return c.json({
      ok: true,
      wallet,
      splits,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Split config save failed");
    return c.json({ error: err.message || "Failed to save split config" }, 500);
  }
});

export { app as splitRoutes };
