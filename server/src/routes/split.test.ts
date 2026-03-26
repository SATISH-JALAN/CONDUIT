import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { splitRoutes } from "./split.js";
import { db } from "../shared/db.js";
import { splitConfigs, users } from "../db/schema.js";

type SplitItem = { destination: string; percentage: number; label: string };
type ErrorPayload = { error: string };
type SplitResponsePayload = { splits: SplitItem[] };

const TEST_WALLET = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const TEST_DEST = "GBOVK4DPS2H34SHRVE74LJQOT3TDIFOVKBJ6TJ3SQ2UQ4JG7A6F2QX63";

describe("split routes", () => {
  test("POST /api/split rejects invalid percentage total", async () => {
    const res = await splitRoutes.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: TEST_WALLET,
        splits: [
          { destination: TEST_WALLET, label: "Wallet", percentage: 80 },
          { destination: TEST_DEST, label: "Charity", percentage: 10 },
        ],
      }),
    });
    expect(res.status).toBe(400);

    const payload = (await res.json()) as ErrorPayload;
    expect(payload.error).toContain("sum to 100");
  });

  test("POST /api/split saves valid config and GET returns it", async () => {
    await db
      .insert(users)
      .values({ wallet: TEST_WALLET })
      .onConflictDoNothing();

    const postRes = await splitRoutes.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: TEST_WALLET,
        splits: [
          { destination: TEST_WALLET, label: "Wallet", percentage: 50 },
          { destination: TEST_DEST, label: "Charity", percentage: 50 },
        ],
      }),
    });
    expect(postRes.status).toBe(200);

    const row = await db
      .select({ wallet: splitConfigs.wallet, splits: splitConfigs.splits })
      .from(splitConfigs)
      .where(eq(splitConfigs.wallet, TEST_WALLET))
      .limit(1);

    expect(row.length).toBe(1);
    expect(row[0].splits.length).toBe(2);

    const getRes = await splitRoutes.request(`/${TEST_WALLET}`);
    expect(getRes.status).toBe(200);
    const getPayload = (await getRes.json()) as SplitResponsePayload;
    expect(getPayload.splits.length).toBe(2);
  });

  test("GET /api/split/:wallet returns default config when none exists", async () => {
    const wallet = "GDQOE23M5J5X5X7KIVYL4JD7KTIBIE4FGMHW6L4QXJEEZ5MVBZJA6YHQ";

    const res = await splitRoutes.request(`/${wallet}`);
    expect(res.status).toBe(200);

    const payload = (await res.json()) as SplitResponsePayload;
    expect(payload.splits).toEqual([
      { destination: wallet, percentage: 100, label: "Wallet" },
    ]);
  });
});
