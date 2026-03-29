import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../shared/db.js";
import { harvests, splitConfigs } from "../db/schema.js";
import { getAnchor, setAnchor } from "../stream/cache.js";
import { calculatePendingYield } from "../stream/formula.js";
import {
  buildHarvestTx,
  readOnChainAccrued,
  submitSignedTx,
} from "../shared/stellar.js";
import { harvestSchema } from "../shared/types.js";
import { authMiddleware } from "../shared/auth.js";
import { logger } from "../shared/logger.js";
import type { Anchor } from "../stream/formula.js";

const app = new Hono();

function defaultSplits(wallet: string) {
  return [{ destination: wallet, label: "Wallet", percentage: 100 }];
}

function allocateSplitAmounts(
  totalAmount: number,
  splits: Array<{ destination: string; label: string; percentage: number }>,
) {
  const stroopsScale = 10_000_000;
  const totalUnits = Math.round(totalAmount * stroopsScale);

  let assigned = 0;
  const withAmounts = splits.map((split, index) => {
    const units =
      index === splits.length - 1
        ? totalUnits - assigned
        : Math.floor((totalUnits * split.percentage) / 100);
    assigned += units;

    return {
      ...split,
      amount: units / stroopsScale,
    };
  });

  return withAmounts;
}

/**
 * POST /api/harvest/build
 * Calculate pending yield and build an unsigned harvest transaction.
 */
app.post("/build", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const harvestResult = harvestSchema.safeParse(body);
    if (!harvestResult.success) {
      return c.json({ error: harvestResult.error.issues[0].message }, 400);
    }

    const wallet = c.get("wallet");
    if (body.wallet && body.wallet !== wallet) {
      return c.json({ error: "Wallet mismatch with authenticated user" }, 403);
    }

    const { box_id } = harvestResult.data;

    // Get anchor from Redis
    const anchor = await getAnchor(wallet, box_id);
    if (!anchor) {
      return c.json({ error: "No active position found for this box" }, 404);
    }

    // Calculate pending yield
    const pendingYield = calculatePendingYield(anchor);
    if (pendingYield <= 0) {
      return c.json({ error: "No yield to harvest yet" }, 400);
    }

    const onChainAccrued = await readOnChainAccrued(wallet);
    let verification:
      | {
          enabled: boolean;
          ok: boolean;
          latencyMs: number;
          localPending?: number;
          onChainPending?: number;
          divergenceBps?: number;
          fallbackReason?: string;
        }
      | undefined;

    if (onChainAccrued.enabled) {
      if (onChainAccrued.ok && onChainAccrued.value !== null) {
        const local = pendingYield;
        const chain = onChainAccrued.value;
        const divergenceBps =
          local > 0
            ? Math.round((Math.abs(chain - local) / local) * 10_000)
            : 0;

        logger.info(
          {
            wallet,
            box_id,
            method: onChainAccrued.method,
            latencyMs: onChainAccrued.latencyMs,
            localPending: local,
            onChainPending: chain,
            divergenceBps,
          },
          "Harvest read verification completed",
        );

        verification = {
          enabled: true,
          ok: true,
          latencyMs: onChainAccrued.latencyMs,
          localPending: Math.round(local * 10_000) / 10_000,
          onChainPending: Math.round(chain * 10_000) / 10_000,
          divergenceBps,
        };
      } else {
        logger.warn(
          {
            wallet,
            box_id,
            method: onChainAccrued.method,
            latencyMs: onChainAccrued.latencyMs,
            fallbackReason:
              onChainAccrued.fallbackReason || onChainAccrued.error,
          },
          "Harvest read verification fallback",
        );

        verification = {
          enabled: true,
          ok: false,
          latencyMs: onChainAccrued.latencyMs,
          fallbackReason: onChainAccrued.fallbackReason || onChainAccrued.error,
        };
      }
    }

    // Resolve active split config from PostgreSQL; default to 100% self when absent.
    const [splitConfig] = await db
      .select({ splits: splitConfigs.splits })
      .from(splitConfigs)
      .where(eq(splitConfigs.wallet, wallet))
      .limit(1);

    const splits = splitConfig?.splits ?? defaultSplits(wallet);
    const allocatedSplits = allocateSplitAmounts(pendingYield, splits);

    // Build unsigned XDR with one payment op per split destination.
    const { xdr, networkPassphrase } = await buildHarvestTx(
      wallet,
      pendingYield,
      box_id,
      allocatedSplits.map((split) => ({
        destination: split.destination,
        amount: split.amount,
        label: split.label,
      })),
    );

    return c.json({
      xdr,
      networkPassphrase,
      box_id,
      amount: Math.round(pendingYield * 10000) / 10000,
      splits: allocatedSplits,
      verification,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Harvest build failed");
    return c.json(
      { error: err.message || "Failed to build harvest transaction" },
      500,
    );
  }
});

/**
 * POST /api/harvest/submit
 * Submit a signed harvest transaction and record the harvest.
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
      logger.error(
        { err: stellarErr.message },
        "Stellar harvest submit failed",
      );
      return c.json(
        { error: "Transaction rejected: " + stellarErr.message },
        400,
      );
    }

    // Record harvest in PostgreSQL
    await db.insert(harvests).values({
      wallet,
      boxId: box_id,
      amount: amount.toFixed(7),
      txHash,
    });

    // Reset anchor sync_ts to now (yield resets to 0)
    const anchor = await getAnchor(wallet, box_id);
    if (anchor) {
      const updatedAnchor: Anchor = {
        ...anchor,
        sync_ts: Date.now() / 1000,
      };
      await setAnchor(wallet, updatedAnchor);
    }

    logger.info({ wallet, box_id, amount, txHash }, "Harvest recorded");

    return c.json({
      ok: true,
      txHash,
      amount: Math.round(amount * 10000) / 10000,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Harvest submit failed");
    return c.json({ error: err.message || "Failed to record harvest" }, 500);
  }
});

export { app as harvestRoutes };
