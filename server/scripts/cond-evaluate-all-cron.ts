#!/usr/bin/env bun
/**
 * Scheduled COND v1 batch: POST /api/internal/cond-evaluate-all with HMAC.
 *
 * Env (same as production API):
 *   COND_HMAC_SECRET   Required, ≥32 chars, must match the Bun server.
 *   SERVER_PUBLIC_URL  Optional API origin without path, default http://127.0.0.1:5000
 *
 * Run from server directory (loads .env from cwd):
 *   bun run cron:cond-evaluate-all
 *
 * Render Cron: set env vars, working directory = server, command:
 *   bun run cron:cond-evaluate-all
 */
import { createHmac } from "node:crypto";
import { config } from "dotenv";

config();

function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

const secret = process.env.COND_HMAC_SECRET ?? "";
if (secret.length < 32) {
  console.error("COND_HMAC_SECRET missing or shorter than 32 characters.");
  process.exit(1);
}

const base = (process.env.SERVER_PUBLIC_URL ?? "http://127.0.0.1:5000").replace(
  /\/+$/,
  "",
);

const body = {
  request_nonce: `cron-${crypto.randomUUID()}`,
  request_ts: new Date().toISOString(),
};
const payload = JSON.stringify(body);
const sig = hmacHex(secret, payload);

const url = `${base}/api/internal/cond-evaluate-all`;

let res: Response;
try {
  res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cond-signature": sig,
    },
    body: payload,
  });
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("Fetch failed:", msg);
  process.exit(1);
}

const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text.slice(0, 4000));
if (!res.ok) process.exit(1);
