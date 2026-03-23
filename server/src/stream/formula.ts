/**
 * Streaming yield formula: V(t) = P × e^(r × Δt)
 *
 * This is the core math behind the live counter.
 * Runs client-side between WebSocket anchor updates.
 */

export interface Anchor {
  principal: number;    // P — deposited amount
  apy_bps: number;      // APY in basis points (521 = 5.21%)
  sync_ts: number;      // Unix timestamp of last on-chain sync
  box_id: string;       // Which bond box this position is in
}

/**
 * Calculate current value from anchor data.
 * Uses continuous compounding: V(t) = P × e^(r × Δt)
 */
export function calculateValue(anchor: Anchor, nowMs: number = Date.now()): number {
  const P = anchor.principal;
  const r = (anchor.apy_bps / 10000) / (365 * 86400); // APY bps → continuous rate per second
  const dt = Math.max(0, nowMs / 1000 - anchor.sync_ts);
  return P * Math.exp(r * dt);
}

/**
 * Calculate pending (unharvested) yield
 */
export function calculatePendingYield(anchor: Anchor, nowMs: number = Date.now()): number {
  return calculateValue(anchor, nowMs) - anchor.principal;
}

/**
 * Calculate yield rate per second in dollars
 */
export function yieldPerSecond(anchor: Anchor): number {
  const r = (anchor.apy_bps / 10000) / (365 * 86400);
  return anchor.principal * r;
}

/**
 * Calculate daily yield in dollars
 */
export function yieldPerDay(anchor: Anchor): number {
  return yieldPerSecond(anchor) * 86400;
}
