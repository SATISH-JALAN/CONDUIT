import { computeHmacHex } from "./hmac.js";

export type InternalTxBody = {
  wallet: string;
  action: "harvest" | "rebalance" | "rotate" | "notify";
  dry_run: boolean;
  params: Record<string, unknown>;
  request_nonce: string;
  request_ts: string;
};

/**
 * POST signed dry-run (or live) to Bun /api/internal/tx.
 * Used by COND v1 evaluate loop and optional Python agent.
 */
export async function postInternalTx(opts: {
  baseUrl: string;
  secret: string;
  body: InternalTxBody;
}): Promise<{ ok: boolean; status: number; json: unknown }> {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const payload = JSON.stringify(opts.body);
  const sig = computeHmacHex(opts.secret, payload);

  const res = await fetch(`${base}/api/internal/tx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cond-signature": sig,
    },
    body: payload,
  });

  const json = (await res.json().catch(() => ({}))) as unknown;
  return { ok: res.ok, status: res.status, json };
}

export function getServerBaseUrlForInternalCalls(): string {
  return (
    process.env.SERVER_PUBLIC_URL?.replace(/\/+$/, "") ||
    `http://127.0.0.1:${process.env.PORT || 5000}`
  );
}

export type CondSnapshotRequestBody = {
  request_nonce: string;
  request_ts: string;
};

/**
 * POST signed snapshot request to Bun /api/internal/cond-snapshot.
 */
export async function postCondSnapshot(opts: {
  baseUrl: string;
  secret: string;
  body: CondSnapshotRequestBody;
}): Promise<{ ok: boolean; status: number; json: unknown }> {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const payload = JSON.stringify(opts.body);
  const sig = computeHmacHex(opts.secret, payload);

  const res = await fetch(`${base}/api/internal/cond-snapshot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cond-signature": sig,
    },
    body: payload,
  });

  const json = (await res.json().catch(() => ({}))) as unknown;
  return { ok: res.ok, status: res.status, json };
}

/**
 * POST signed batch evaluate (all eligible wallets) to /api/internal/cond-evaluate-all.
 */
export async function postCondEvaluateAll(opts: {
  baseUrl: string;
  secret: string;
  body: CondSnapshotRequestBody;
}): Promise<{ ok: boolean; status: number; json: unknown }> {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const payload = JSON.stringify(opts.body);
  const sig = computeHmacHex(opts.secret, payload);

  const res = await fetch(`${base}/api/internal/cond-evaluate-all`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cond-signature": sig,
    },
    body: payload,
  });

  const json = (await res.json().catch(() => ({}))) as unknown;
  return { ok: res.ok, status: res.status, json };
}
