import { buildCondSnapshot } from "./condSnapshot.js";
import { evaluateCondV1Rules } from "./condRulesEngine.js";
import type { CondRuleProposal } from "./condRulesEngine.js";
import {
  getServerBaseUrlForInternalCalls,
  postInternalTx,
  type InternalTxBody,
} from "./condInternalClient.js";
import { logger } from "./logger.js";

function requireCondSecret(): string {
  const secret = process.env.COND_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "COND_HMAC_SECRET is missing or too short (min 32 chars recommended)",
    );
  }
  return secret;
}

export type CondEvaluateResultItem = {
  action: string;
  status: number;
  ok: boolean;
  body: unknown;
};

/**
 * Submit rule proposals as dry-run internal tx calls (HMAC to /api/internal/tx).
 */
export async function submitCondProposals(
  wallet: string,
  proposals: CondRuleProposal[],
): Promise<CondEvaluateResultItem[]> {
  const secret = requireCondSecret();
  const baseUrl = getServerBaseUrlForInternalCalls();
  const results: CondEvaluateResultItem[] = [];

  for (const pr of proposals) {
    const body: InternalTxBody = {
      wallet,
      action: pr.action,
      dry_run: true,
      params: {
        ...pr.params,
        reasoning: pr.reasoning,
        confidence: pr.confidence,
      },
      request_nonce: `cond-${crypto.randomUUID()}`,
      request_ts: new Date().toISOString(),
    };

    try {
      const r = await postInternalTx({ baseUrl, secret, body });
      results.push({
        action: pr.action,
        status: r.status,
        ok: r.ok,
        body: r.json,
      });
    } catch (err: any) {
      logger.error(
        { err: err?.message, wallet, action: pr.action },
        "COND evaluate internal tx call failed",
      );
      results.push({
        action: pr.action,
        status: 0,
        ok: false,
        body: { error: err?.message || "fetch_failed" },
      });
    }
  }

  return results;
}

/**
 * Run COND v1 rules for one wallet and submit each proposal as dry-run internal tx.
 */
export async function runCondEvaluateForWallet(
  wallet: string,
): Promise<{ ok: boolean; wallet: string; submitted: number; results: CondEvaluateResultItem[] }> {
  const { candidates } = await buildCondSnapshot();
  const candidate = candidates.find((c) => c.wallet === wallet);

  if (!candidate) {
    return { ok: true, wallet, submitted: 0, results: [] };
  }

  const proposals = evaluateCondV1Rules(candidate);
  const results = await submitCondProposals(wallet, proposals);

  return {
    ok: true,
    wallet,
    submitted: results.filter((r) => r.ok).length,
    results,
  };
}

/**
 * Evaluate all snapshot candidates (for HMAC / Python scheduler).
 */
export async function runCondEvaluateAll(): Promise<{
  ok: boolean;
  walletsEvaluated: number;
  details: Array<{
    wallet: string;
    proposalCount: number;
    submitted: number;
    results: CondEvaluateResultItem[];
  }>;
}> {
  const { candidates } = await buildCondSnapshot();
  const details: Array<{
    wallet: string;
    proposalCount: number;
    submitted: number;
    results: CondEvaluateResultItem[];
  }> = [];

  for (const c of candidates) {
    const proposals = evaluateCondV1Rules(c);
    if (proposals.length === 0) continue;

    const results = await submitCondProposals(c.wallet, proposals);
    details.push({
      wallet: c.wallet,
      proposalCount: proposals.length,
      submitted: results.filter((r) => r.ok).length,
      results,
    });
  }

  return {
    ok: true,
    walletsEvaluated: details.length,
    details,
  };
}
