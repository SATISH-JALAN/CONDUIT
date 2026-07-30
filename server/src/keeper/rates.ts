import { eq } from "drizzle-orm";
import { db } from "../shared/db.js";
import { bondBoxes, apyHistory } from "../db/schema.js";
import { setOracleRate, isRateKeeperEnabled } from "../shared/stellar.js";
import { logger } from "../shared/logger.js";

const MAX_APY_BPS = 100_000;
const DRIFT_BPS = parseInt(process.env.RATE_DRIFT_BPS || "25", 10);

/**
 * Compute the APY (bps) to publish for a box from its reference rate plus a
 * small, bounded, time-based drift so on-chain rates move realistically.
 *
 * In production the base rate would come from a benchmark feed (e.g. treasury
 * yields, Benji NAV, or a Reflector oracle). Here the box's configured `apyBps`
 * is the reference and the drift simulates market movement; swapping the source
 * requires changing only this function.
 */
export function computeRate(baseBps: number, at: number = Date.now()): number {
  // Deterministic drift in [-DRIFT_BPS, +DRIFT_BPS] from a slow sine over hours,
  // phase-shifted per box so boxes do not all move in lockstep.
  const hours = at / 3_600_000;
  const drift = Math.round(DRIFT_BPS * Math.sin(hours + baseBps));
  const apy = baseBps + drift;
  return Math.min(MAX_APY_BPS, Math.max(1, apy));
}

export interface KeeperResult {
  boxId: string;
  apyBps: number;
  txHash?: string;
  error?: string;
}

/**
 * Publish each active box's current APY to the on-chain rate oracle and record
 * the value in apy_history. Returns per-box results.
 */
export async function runRateKeeper(): Promise<{
  updated: number;
  results: KeeperResult[];
}> {
  if (!isRateKeeperEnabled()) {
    throw new Error(
      "Rate keeper disabled: set SOROBAN_ENABLED=true, RATE_ORACLE_CONTRACT_ID, and STELLAR_OPERATIONAL_SECRET",
    );
  }

  const boxes = await db
    .select({ id: bondBoxes.id, apyBps: bondBoxes.apyBps })
    .from(bondBoxes)
    .where(eq(bondBoxes.active, true));

  const results: KeeperResult[] = [];
  let updated = 0;

  for (const box of boxes) {
    const apyBps = computeRate(box.apyBps);
    try {
      const { txHash } = await setOracleRate(box.id, apyBps);
      await db
        .insert(apyHistory)
        .values({ boxId: box.id, apyBps, source: "keeper" });
      updated += 1;
      results.push({ boxId: box.id, apyBps, txHash });
      logger.info({ boxId: box.id, apyBps, txHash }, "Oracle rate published");
    } catch (err: any) {
      results.push({ boxId: box.id, apyBps, error: err.message });
      logger.error(
        { boxId: box.id, apyBps, err: err.message },
        "Oracle rate update failed",
      );
    }
  }

  logger.info({ updated, total: boxes.length }, "Rate keeper run complete");
  return { updated, results };
}
