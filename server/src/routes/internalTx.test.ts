import { describe, expect, test } from "bun:test";
import { internalRoutes } from "./internalTx.js";
import { computeHmacHex } from "../shared/hmac.js";

const TEST_SECRET = "test-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TEST_WALLET = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";

type ErrorPayload = { error: string };

describe("internal tx routes", () => {
  test("rejects missing/invalid signature", async () => {
    process.env.COND_HMAC_SECRET = TEST_SECRET;

    const body = {
      wallet: TEST_WALLET,
      action: "harvest",
      dry_run: true,
      params: { box_id: "us-treasury-10y" },
      request_nonce: `nonce-${crypto.randomUUID()}`,
      request_ts: new Date().toISOString(),
    };

    const res = await internalRoutes.request("/tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(401);
    const payload = (await res.json()) as ErrorPayload;
    expect(payload.error).toMatch(/Unauthorized/i);
  });

  test("accepts valid signed dry-run request", async () => {
    process.env.COND_HMAC_SECRET = TEST_SECRET;

    const body = {
      wallet: TEST_WALLET,
      action: "harvest",
      dry_run: true,
      params: { box_id: "us-treasury-10y" },
      request_nonce: `nonce-${crypto.randomUUID()}`,
      request_ts: new Date().toISOString(),
    };

    const payload = JSON.stringify(body);
    const sig = computeHmacHex(TEST_SECRET, payload);

    const res = await internalRoutes.request("/tx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cond-signature": sig,
      },
      body: payload,
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      accepted: boolean;
      dry_run: boolean;
    };
    expect(json.ok).toBe(true);
    expect(json.accepted).toBe(true);
    expect(json.dry_run).toBe(true);
  });

  test("rejects replayed nonce", async () => {
    process.env.COND_HMAC_SECRET = TEST_SECRET;

    const body = {
      wallet: TEST_WALLET,
      action: "notify",
      dry_run: true,
      params: { message: "hello", confidence: 0.9, reasoning: "demo" },
      request_nonce: `nonce-${crypto.randomUUID()}`,
      request_ts: new Date().toISOString(),
    };

    const payload = JSON.stringify(body);
    const sig = computeHmacHex(TEST_SECRET, payload);

    const first = await internalRoutes.request("/tx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cond-signature": sig,
      },
      body: payload,
    });
    expect(first.status).toBe(200);

    const second = await internalRoutes.request("/tx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cond-signature": sig,
      },
      body: payload,
    });
    expect(second.status).toBe(409);
    const json = (await second.json()) as { error: string };
    expect(json.error).toMatch(/Replay/i);
  });

  test("cond-snapshot rejects invalid signature", async () => {
    process.env.COND_HMAC_SECRET = TEST_SECRET;

    const body = {
      request_nonce: `snap-${crypto.randomUUID()}`,
      request_ts: new Date().toISOString(),
    };

    const res = await internalRoutes.request("/cond-snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(401);
  });

  test("cond-snapshot accepts valid HMAC", async () => {
    process.env.COND_HMAC_SECRET = TEST_SECRET;

    const body = {
      request_nonce: `snap-${crypto.randomUUID()}`,
      request_ts: new Date().toISOString(),
    };

    const payload = JSON.stringify(body);
    const sig = computeHmacHex(TEST_SECRET, payload);

    const res = await internalRoutes.request("/cond-snapshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cond-signature": sig,
      },
      body: payload,
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      candidates: unknown[];
    };
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.candidates)).toBe(true);
  });

  test("cond-proposal rejects invalid signature", async () => {
    process.env.COND_HMAC_SECRET = TEST_SECRET;

    const body = {
      wallet: TEST_WALLET,
      action: "notify",
      params: { message: "hi" },
      reasoning: "proposal test",
      confidence: 0.55,
      request_nonce: `prop-${crypto.randomUUID()}`,
      request_ts: new Date().toISOString(),
    };

    const res = await internalRoutes.request("/cond-proposal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(401);
  });

  test("cond-proposal accepts valid HMAC", async () => {
    process.env.COND_HMAC_SECRET = TEST_SECRET;

    const body = {
      wallet: TEST_WALLET,
      action: "notify",
      params: { message: "hi" },
      reasoning: "proposal test",
      confidence: 0.55,
      request_nonce: `prop-${crypto.randomUUID()}`,
      request_ts: new Date().toISOString(),
    };

    const payload = JSON.stringify(body);
    const sig = computeHmacHex(TEST_SECRET, payload);

    const res = await internalRoutes.request("/cond-proposal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cond-signature": sig,
      },
      body: payload,
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; proposalId: string | null };
    expect(json.ok).toBe(true);
  });
});

