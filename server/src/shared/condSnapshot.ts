import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "./db.js";
import { bondBoxes, mandates, positions } from "../db/schema.js";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

export type CondSnapshotMandate = {
  paused: boolean;
  riskTolerance: "Conservative" | "Moderate" | "Aggressive";
  autoCompound: boolean;
  compoundThresholdCents: number;
  minCreditRating: "AAA" | "AA" | "A" | "BBB";
};

export type CondSnapshotPosition = {
  box_id: string;
  principal: number;
  apy_bps: number;
  sync_ts: number;
  box_risk: "Low" | "Medium" | "High";
};

export type CondSnapshotCandidate = {
  wallet: string;
  mandate: CondSnapshotMandate;
  positions: CondSnapshotPosition[];
};

/**
 * Eligible wallets: active positions, mandate not paused (missing mandate = not paused).
 */
export async function buildCondSnapshot(): Promise<{
  candidates: CondSnapshotCandidate[];
}> {
  const rows = await db
    .select({
      wallet: positions.wallet,
      boxId: positions.boxId,
      principal: positions.principal,
      apyBps: positions.apyBps,
      syncTs: positions.syncTs,
      boxRisk: bondBoxes.risk,
      mandatePaused: mandates.paused,
      mandateRiskTolerance: mandates.riskTolerance,
      mandateAutoCompound: mandates.autoCompound,
      mandateCompoundThreshold: mandates.compoundThresholdCents,
      mandateMinCredit: mandates.minCreditRating,
    })
    .from(positions)
    .innerJoin(bondBoxes, eq(positions.boxId, bondBoxes.id))
    .leftJoin(mandates, eq(positions.wallet, mandates.wallet))
    .where(
      and(
        eq(positions.active, true),
        or(isNull(mandates.paused), eq(mandates.paused, false)),
      ),
    );

  const map = new Map<string, CondSnapshotCandidate>();

  for (const r of rows) {
    let entry = map.get(r.wallet);
    if (!entry) {
      entry = {
        wallet: r.wallet,
        mandate: {
          paused: r.mandatePaused ?? false,
          riskTolerance:
            (r.mandateRiskTolerance as CondSnapshotMandate["riskTolerance"]) ??
            "Moderate",
          autoCompound: r.mandateAutoCompound ?? true,
          compoundThresholdCents: r.mandateCompoundThreshold ?? 5000,
          minCreditRating:
            (r.mandateMinCredit as CondSnapshotMandate["minCreditRating"]) ??
            "A",
        },
        positions: [],
      };
      map.set(r.wallet, entry);
    }

    entry.positions.push({
      box_id: r.boxId,
      principal: toNumber(r.principal),
      apy_bps: r.apyBps,
      sync_ts: toNumber(r.syncTs),
      box_risk: r.boxRisk as CondSnapshotPosition["box_risk"],
    });
  }

  return { candidates: [...map.values()] };
}
