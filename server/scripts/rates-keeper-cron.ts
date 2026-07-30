#!/usr/bin/env bun
/**
 * Scheduled rate keeper: publishes each active box's APY to the on-chain rate
 * oracle and records apy_history. This is how oracle rates stay live.
 *
 * Env (same as the server):
 *   SOROBAN_ENABLED=true
 *   RATE_ORACLE_CONTRACT_ID     deployed oracle contract id
 *   STELLAR_OPERATIONAL_SECRET  oracle admin secret key (server-side only)
 *   SOROBAN_RPC_URL             Soroban RPC endpoint
 *   DATABASE_URL                Postgres (for apy_history)
 *
 * Run from the server directory (loads .env from cwd):
 *   bun run cron:rates-keeper
 *
 * Render Cron: working directory = server, command: bun run cron:rates-keeper
 */
import { config } from "dotenv";

config();

import { runRateKeeper } from "../src/keeper/rates.js";

try {
  const { updated, results } = await runRateKeeper();
  console.log(`Rate keeper: published ${updated}/${results.length} box rates`);
  for (const r of results) {
    console.log(
      `  ${r.boxId}: ${r.apyBps}bps ${r.txHash ? "✓ " + r.txHash : "✗ " + r.error}`,
    );
  }
  process.exit(updated > 0 || results.length === 0 ? 0 : 1);
} catch (err: any) {
  console.error("Rate keeper failed:", err.message);
  process.exit(1);
}
