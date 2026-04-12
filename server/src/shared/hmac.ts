import crypto from "node:crypto";

function timingSafeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function computeHmacHex(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyHmacHex(
  secret: string,
  payload: string,
  providedHex: string,
): boolean {
  const expected = computeHmacHex(secret, payload);
  return timingSafeEqual(expected, providedHex.toLowerCase());
}

