import { describe, expect, test } from "bun:test";
import { leaderboardRoutes } from "./leaderboard.js";
import { raceRoutes } from "./race.js";
import { generateAccessToken } from "../shared/auth.js";

const TEST_WALLET = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";

describe("feature 5 routes", () => {
  test("GET /api/leaderboard returns payload shape", async () => {
    const res = await leaderboardRoutes.request("/?period=7d&limit=10");
    expect(res.status).toBe(200);

    const payload = (await res.json()) as {
      period: string;
      totalTvl: number;
      entries: Array<unknown>;
    };

    expect(payload.period).toBe("7d");
    expect(Array.isArray(payload.entries)).toBe(true);
    expect(typeof payload.totalTvl).toBe("number");
  });

  test("POST /api/race/join joins active race with JWT", async () => {
    const token = await generateAccessToken(TEST_WALLET);

    const joinRes = await raceRoutes.request("/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    expect(joinRes.status).toBe(200);

    const joinPayload = (await joinRes.json()) as {
      ok: boolean;
      joined: boolean;
      race: { id: string; participants: number };
    };

    expect(joinPayload.ok).toBe(true);
    expect(typeof joinPayload.race.id).toBe("string");
    expect(joinPayload.race.participants).toBeGreaterThan(0);

    const activeRes = await raceRoutes.request("/active", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(activeRes.status).toBe(200);

    const activePayload = (await activeRes.json()) as { joined: boolean };
    expect(activePayload.joined).toBe(true);
  });
});
