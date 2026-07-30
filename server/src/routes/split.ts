import { Hono } from "hono";
import { db } from "../shared/db.js";
import { splitConfigs, users } from "../db/schema.js";
import { logger } from "../shared/logger.js";
import {
  saveSplitConfigSchema,
  stellarAddressSchema,
} from "../shared/types.js";
import { authMiddleware } from "../shared/auth.js";
import { buildSetSplitTx, submitSignedTx } from "../shared/stellar.js";
import { eq } from "drizzle-orm";

const app = new Hono();

function defaultSplit(wallet: string) {
  return [{ destination: wallet, percentage: 100, label: "Wallet" }];
}

async function mirrorSplitToDb(
  wallet: string,
  splits: (typeof splitConfigs.$inferInsert)["splits"],
): Promise<void> {
  await db.insert(users).values({ wallet }).onConflictDoNothing();
  await db
    .insert(splitConfigs)
    .values({ wallet, splits, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: splitConfigs.wallet,
      set: { splits, updatedAt: new Date() },
    });
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
app.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const parsed = saveSplitConfigSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0].message }, 400);
    }

    const wallet = c.get("wallet");
    if (parsed.data.wallet && parsed.data.wallet !== wallet) {
      return c.json({ error: "Wallet mismatch with authenticated user" }, 403);
    }

    const splits = parsed.data.splits;

    await mirrorSplitToDb(wallet, splits);

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

// POST /api/split/build — build an unsigned on-chain set_split for the user to sign.
app.post("/build", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const parsed = saveSplitConfigSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0].message }, 400);
    }

    const wallet = c.get("wallet");
    if (parsed.data.wallet && parsed.data.wallet !== wallet) {
      return c.json({ error: "Wallet mismatch with authenticated user" }, 403);
    }

    const { xdr, networkPassphrase } = await buildSetSplitTx(
      wallet,
      parsed.data.splits,
    );
    return c.json({ xdr, networkPassphrase });
  } catch (err: any) {
    logger.error({ err: err.message }, "Split build failed");
    return c.json(
      { error: err.message || "Failed to build split transaction" },
      500,
    );
  }
});

// POST /api/split/submit — submit the signed set_split and mirror it to the DB.
app.post("/submit", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const wallet = c.get("wallet");
    const { signedXdr, splits } = body;

    if (!signedXdr) {
      return c.json({ error: "Missing required field: signedXdr" }, 400);
    }

    let txHash: string;
    try {
      ({ txHash } = await submitSignedTx(signedXdr));
    } catch (stellarErr: any) {
      logger.error({ err: stellarErr.message }, "Split submit rejected");
      return c.json(
        { error: "Transaction rejected: " + stellarErr.message },
        400,
      );
    }

    // Mirror the on-chain config to Postgres for fast reads.
    if (Array.isArray(splits)) {
      await mirrorSplitToDb(wallet, splits);
    }

    logger.info({ wallet, txHash }, "On-chain split configured");
    return c.json({ ok: true, txHash });
  } catch (err: any) {
    logger.error({ err: err.message }, "Split submit failed");
    return c.json({ error: err.message || "Failed to submit split" }, 500);
  }
});

export { app as splitRoutes };
