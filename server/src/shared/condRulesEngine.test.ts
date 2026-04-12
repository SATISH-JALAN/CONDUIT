import { describe, expect, test } from "bun:test";
import { evaluateCondV1Rules } from "./condRulesEngine.js";
import type { CondSnapshotCandidate } from "./condSnapshot.js";

const baseCandidate = (over: Partial<CondSnapshotCandidate>): CondSnapshotCandidate => ({
  wallet: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
  mandate: {
    paused: false,
    riskTolerance: "Moderate",
    autoCompound: true,
    compoundThresholdCents: 5000,
    minCreditRating: "A",
  },
  positions: [
    {
      box_id: "box-a",
      principal: 10_000,
      apy_bps: 500,
      sync_ts: Math.floor(Date.now() / 1000) - 86400 * 30,
      box_risk: "Low",
    },
  ],
  ...over,
});

describe("evaluateCondV1Rules", () => {
  test("returns empty when paused", () => {
    const out = evaluateCondV1Rules(
      baseCandidate({
        mandate: {
          paused: true,
          riskTolerance: "Moderate",
          autoCompound: true,
          compoundThresholdCents: 1,
          minCreditRating: "A",
        },
      }),
    );
    expect(out).toEqual([]);
  });

  test("proposes notify for Conservative + High-risk box", () => {
    const out = evaluateCondV1Rules(
      baseCandidate({
        mandate: {
          paused: false,
          riskTolerance: "Conservative",
          autoCompound: false,
          compoundThresholdCents: 999999,
          minCreditRating: "A",
        },
        positions: [
          {
            box_id: "risky",
            principal: 1000,
            apy_bps: 800,
            sync_ts: Math.floor(Date.now() / 1000) - 60,
            box_risk: "High",
          },
        ],
      }),
    );
    const notify = out.find((p) => p.action === "notify");
    expect(notify).toBeDefined();
    expect(String(notify?.params.message)).toContain("High-risk");
  });

  test("proposes harvest when pending meets threshold", () => {
    const out = evaluateCondV1Rules(
      baseCandidate({
        mandate: {
          paused: false,
          riskTolerance: "Moderate",
          autoCompound: true,
          compoundThresholdCents: 1,
          minCreditRating: "A",
        },
        positions: [
          {
            box_id: "big",
            principal: 50_000,
            apy_bps: 1000,
            sync_ts: Math.floor(Date.now() / 1000) - 86400 * 365,
            box_risk: "Low",
          },
        ],
      }),
    );
    const harvest = out.find((p) => p.action === "harvest");
    expect(harvest).toBeDefined();
    expect(harvest?.params.box_id).toBe("big");
  });
});
