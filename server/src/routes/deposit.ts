import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../shared/db.js";
import { positions, bondBoxes } from "../db/schema.js";
import { setAnchor } from "../stream/cache.js";
import {
  buildDepositTx,
  submitSignedTx,
  fundWithFriendbot,
} from "../shared/stellar.js";
import { depositSchema } from "../shared/types.js";
import { authMiddleware } from "../shared/auth.js";
import { logger } from "../shared/logger.js";
import type { Anchor } from "../stream/formula.js";
import { publishWalletEvent } from "../shared/redis.js";

const app = new Hono();

// ────────────────────────────────────────
// DEPOSIT
// ────────────────────────────────────────

/**
 * POST /api/deposit/build
 * Build an unsigned deposit transaction for the user to sign with Freighter.
 */
app.post("/build", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const depositResult = depositSchema.safeParse(body);
    if (!depositResult.success) {
      return c.json({ error: depositResult.error.issues[0].message }, 400);
    }

    const wallet = c.get("wallet");
    if (body.wallet && body.wallet !== wallet) {
      return c.json({ error: "Wallet mismatch with authenticated user" }, 403);
    }

    const { box_id, amount } = depositResult.data;

    // Check box exists
    const box = await db
      .select()
      .from(bondBoxes)
      .where(eq(bondBoxes.id, box_id))
      .limit(1);
    if (box.length === 0) {
      return c.json({ error: "Bond box not found" }, 404);
    }

    // Check minimum investment
    const minInvestDollars = box[0].minInvestment / 100;
    if (amount < minInvestDollars) {
      return c.json(
        { error: `Minimum investment is $${minInvestDollars}` },
        400,
      );
    }

    // Build unsigned XDR
    const { xdr, networkPassphrase } = await buildDepositTx(
      wallet,
      amount,
      box_id,
    );

    return c.json({ xdr, networkPassphrase, box_id, amount });
  } catch (err: any) {
    logger.error({ err: err.message }, "Deposit build failed");
    return c.json({ error: err.message || "Failed to build transaction" }, 500);
  }
});

/**
 * POST /api/deposit/submit
 * Submit a signed deposit transaction and record the position.
 */
app.post("/submit", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const wallet = c.get("wallet");
    const { box_id, amount, signedXdr } = body;

    if (body.wallet && body.wallet !== wallet) {
      return c.json({ error: "Wallet mismatch with authenticated user" }, 403);
    }

    if (!box_id || !amount || !signedXdr) {
      return c.json(
        { error: "Missing required fields: box_id, amount, signedXdr" },
        400,
      );
    }

    // Submit to Stellar
    let txHash: string | null = null;
    try {
      const result = await submitSignedTx(signedXdr);
      txHash = result.txHash;
    } catch (stellarErr: any) {
      logger.error({ err: stellarErr.message }, "Stellar submit failed");
      return c.json(
        { error: "Transaction rejected by the network: " + stellarErr.message },
        400,
      );
    }

    // Get box APY
    const box = await db
      .select()
      .from(bondBoxes)
      .where(eq(bondBoxes.id, box_id))
      .limit(1);
    const apyBps = box.length > 0 ? box[0].apyBps : 500;

    // Check for existing position
    const existing = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.wallet, wallet),
          eq(positions.boxId, box_id),
          eq(positions.active, true),
        ),
      )
      .limit(1);

    const now = Date.now() / 1000;
    let newPrincipal = amount;

    if (existing.length > 0) {
      // Add to existing position
      newPrincipal = parseFloat(existing[0].principal) + amount;
      await db
        .update(positions)
        .set({
          principal: newPrincipal.toFixed(7),
          syncTs: now.toFixed(6),
          updatedAt: new Date(),
        })
        .where(eq(positions.id, existing[0].id));
    } else {
      // Create new position
      await db.insert(positions).values({
        wallet,
        boxId: box_id,
        principal: newPrincipal.toFixed(7),
        apyBps,
        syncTs: now.toFixed(6),
      });
    }

    // Update Redis anchor
    const anchor: Anchor = {
      principal: newPrincipal,
      apy_bps: apyBps,
      sync_ts: now,
      box_id,
    };
    await setAnchor(wallet, anchor);

    await publishWalletEvent(wallet, {
      type: "ANCHOR_UPDATE",
      data: anchor,
    });

    logger.info({ wallet, box_id, amount, txHash }, "Deposit recorded");

    return c.json({
      ok: true,
      txHash,
      position: {
        wallet,
        box_id,
        principal: newPrincipal,
        apy_bps: apyBps,
        sync_ts: now,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Deposit submit failed");
    return c.json({ error: err.message || "Failed to record deposit" }, 500);
  }
});

// ────────────────────────────────────────
// FUND (dev only — fund account via friendbot)
// ────────────────────────────────────────

app.post("/fund", async (c) => {
  try {
    const { wallet } = await c.req.json();
    if (!wallet) return c.json({ error: "wallet required" }, 400);

    const ok = await fundWithFriendbot(wallet);
    return c.json({ ok, message: ok ? "Account funded" : "Funding failed" });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export { app as depositRoutes };
