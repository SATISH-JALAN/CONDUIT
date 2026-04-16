import { calculatePendingYield } from "../stream/formula.js";
import type { Anchor } from "../stream/formula.js";
import type { CondSnapshotCandidate, CondSnapshotPosition } from "./condSnapshot.js";

export type CondRuleProposal = {
  action: "harvest" | "notify";
  params: Record<string, unknown>;
  reasoning: string;
  confidence: number;
};

function anchorFromPosition(p: CondSnapshotPosition): Anchor {
  return {
    principal: p.principal,
    apy_bps: p.apy_bps,
    sync_ts: p.sync_ts,
    box_id: p.box_id,
  };
}

/**
 * COND v1 rule-based proposals (dry-run only; execution is via /api/internal/tx).
 *
 * Rules:
 * 1) Auto-compound: if total pending yield (USD) * 100 >= compoundThresholdCents, propose harvest on the box with highest pending.
 * 2) Conservative mandate + any High-risk box: propose notify (rebalance suggestion).
 */
export function evaluateCondV1Rules(
  candidate: CondSnapshotCandidate,
): CondRuleProposal[] {
  const { mandate, positions } = candidate;
  if (mandate.paused || positions.length === 0) return [];

  const proposals: CondRuleProposal[] = [];

  const withPending = positions.map((p) => ({
    p,
    pending: calculatePendingYield(anchorFromPosition(p)),
  }));

  const totalPendingUsd = withPending.reduce((s, x) => s + x.pending, 0);
  const thresholdUsd = mandate.compoundThresholdCents / 100;

  if (
    mandate.autoCompound &&
    totalPendingUsd >= thresholdUsd &&
    thresholdUsd > 0
  ) {
    const best = [...withPending].sort((a, b) => b.pending - a.pending)[0];
    if (best && best.pending > 0) {
      proposals.push({
        action: "harvest",
        params: {
          box_id: best.p.box_id,
          reasoning: `Rule v1: pending yield ~$${best.pending.toFixed(4)} meets compound threshold ($${thresholdUsd.toFixed(2)}).`,
          confidence: 0.72,
        },
        reasoning: `Rule v1: pending yield ~$${best.pending.toFixed(4)} meets compound threshold ($${thresholdUsd.toFixed(2)}).`,
        confidence: 0.72,
      });
    }
  }

  if (
    mandate.riskTolerance === "Conservative" &&
    positions.some((p) => p.box_risk === "High")
  ) {
    const highBoxes = positions
      .filter((p) => p.box_risk === "High")
      .map((p) => p.box_id)
      .join(", ");
    proposals.push({
      action: "notify",
      params: {
        message: `Conservative mandate: you hold High-risk boxes (${highBoxes}). Consider rotating to lower-risk boxes.`,
        reasoning:
          "Rule v1: conservative risk tolerance conflicts with High-rated bond box exposure.",
        confidence: 0.68,
      },
      reasoning:
        "Rule v1: conservative risk tolerance conflicts with High-rated bond box exposure.",
      confidence: 0.68,
    });
  }

  return proposals;
}

export function evaluateAllCandidates(
  candidates: CondSnapshotCandidate[],
): Array<{ wallet: string; proposals: CondRuleProposal[] }> {
  return candidates.map((c) => ({
    wallet: c.wallet,
    proposals: evaluateCondV1Rules(c),
  }));
}
