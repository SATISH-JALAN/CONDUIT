import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { agentRoutes } from "./agent.js";
import { generateAccessToken } from "../shared/auth.js";

const TEST_WALLET =
  "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const TEST_SECRET = "test-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("agent /evaluate", () => {
  const app = new Hono().basePath("/api");
  app.route("/agent", agentRoutes);

  const origFetch = globalThis.fetch;

  beforeAll(() => {
    process.env.COND_HMAC_SECRET = TEST_SECRET;
    globalThis.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes("/api/internal/tx")) {
        return new Response(
          JSON.stringify({ ok: true, accepted: true, dry_run: true }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      return origFetch(input as Parameters<typeof fetch>[0], init);
    };
  });

  afterAll(() => {
    globalThis.fetch = origFetch;
  });

  test("returns 401 without auth", async () => {
    const res = await app.request("/api/agent/evaluate", { method: "POST" });
    expect(res.status).toBe(401);
  });

  test("returns 200 for valid JWT", async () => {
    const token = await generateAccessToken(TEST_WALLET);
    const res = await app.request("/api/agent/evaluate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      wallet: string;
      submitted: number;
      results: unknown[];
    };
    expect(json.ok).toBe(true);
    expect(json.wallet).toBe(TEST_WALLET);
    expect(Array.isArray(json.results)).toBe(true);
  });
});
