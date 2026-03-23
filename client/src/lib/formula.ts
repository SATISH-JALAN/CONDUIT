/**
 * Streaming yield formula: V(t) = P × e^(r × Δt)
 * Client-side copy — runs in requestAnimationFrame for live counter.
 */

export interface Anchor {
  principal: number;
  apy_bps: number;
  sync_ts: number;
  box_id: string;
}

/**
 * Calculate current value: V(t) = P × e^(r × Δt)
 */
export function calculateValue(anchor: Anchor, nowMs: number = Date.now()): number {
  const P = anchor.principal;
  const r = (anchor.apy_bps / 10000) / (365 * 86400);
  const dt = Math.max(0, nowMs / 1000 - anchor.sync_ts);
  return P * Math.exp(r * dt);
}

/**
 * Pending (unharvested) yield
 */
export function calculatePendingYield(anchor: Anchor, nowMs: number = Date.now()): number {
  return calculateValue(anchor, nowMs) - anchor.principal;
}

/**
 * Yield rate per second in dollars
 */
export function yieldPerSecond(anchor: Anchor): number {
  const r = (anchor.apy_bps / 10000) / (365 * 86400);
  return anchor.principal * r;
}
