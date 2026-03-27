import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "./db.js";
import {
  leaderboardCache,
  positions,
  raceEntries,
  users,
  yieldRaces,
} from "../db/schema.js";
import { logger } from "./logger.js";

export type LeaderboardPeriod = "7d" | "30d";

const SNAPSHOT_STALE_MS = 15 * 60 * 1000;
const RECOMPUTE_INTERVAL_MS = 15 * 60 * 1000;
const DEFAULT_ENTRY_FEE = 5;

let leaderboardTimer: ReturnType<typeof setInterval> | null = null;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

function walletAlias(wallet: string): string {
  if (wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-6)}`;
}

function parseRaceStatus(value: string): "active" | "closed" {
  return value === "closed" ? "closed" : "active";
}

async function getLatestSnapshotTimestamp(period: LeaderboardPeriod) {
  const latest = await db
    .select({ computedAt: leaderboardCache.computedAt })
    .from(leaderboardCache)
    .where(eq(leaderboardCache.period, period))
    .orderBy(desc(leaderboardCache.computedAt))
    .limit(1);

  return latest[0]?.computedAt ?? null;
}

async function aggregateWalletMetrics() {
  const rows = await db
    .select({
      wallet: positions.wallet,
      principal: positions.principal,
      apyBps: positions.apyBps,
    })
    .from(positions)
    .where(eq(positions.active, true));

  const aggregates = new Map<
    string,
    { principal: number; weightedApyTotal: number }
  >();

  for (const row of rows) {
    const principal = toNumber(row.principal);
    const entry = aggregates.get(row.wallet) ?? {
      principal: 0,
      weightedApyTotal: 0,
    };

    entry.principal += principal;
    entry.weightedApyTotal += principal * row.apyBps;
    aggregates.set(row.wallet, entry);
  }

  return [...aggregates.entries()]
    .map(([wallet, value]) => {
      const avgApyBps =
        value.principal > 0
          ? Math.round(value.weightedApyTotal / value.principal)
          : 0;

      return {
        wallet,
        tvl: value.principal,
        apyBps: avgApyBps,
      };
    })
    .sort((a, b) => {
      if (b.apyBps !== a.apyBps) return b.apyBps - a.apyBps;
      return b.tvl - a.tvl;
    });
}

export async function recomputeLeaderboardSnapshot(period: LeaderboardPeriod) {
  const previousTimestamp = await getLatestSnapshotTimestamp(period);

  const previousRows = previousTimestamp
    ? await db
        .select({
          wallet: leaderboardCache.wallet,
          apyBps: leaderboardCache.apyBps,
        })
        .from(leaderboardCache)
        .where(
          and(
            eq(leaderboardCache.period, period),
            eq(leaderboardCache.computedAt, previousTimestamp),
          ),
        )
    : [];

  const previousApyByWallet = new Map(
    previousRows.map((row) => [row.wallet, row.apyBps]),
  );

  const metrics = await aggregateWalletMetrics();
  const computedAt = new Date();

  if (metrics.length === 0) {
    return {
      period,
      asOf: computedAt.toISOString(),
      totalTvl: 0,
      entries: [] as Array<{
        rank: number;
        wallet: string;
        displayName: string;
        apy: number;
        tvl: number;
        change24h: number;
      }>,
    };
  }

  const insertRows = metrics.map((entry, index) => {
    const previousApyBps =
      previousApyByWallet.get(entry.wallet) ?? entry.apyBps;

    return {
      id: crypto.randomUUID(),
      period,
      wallet: entry.wallet,
      rank: index + 1,
      apyBps: entry.apyBps,
      tvl: entry.tvl.toFixed(7),
      changeBps: entry.apyBps - previousApyBps,
      computedAt,
    };
  });

  await db.insert(leaderboardCache).values(insertRows);

  const totalTvl = metrics.reduce((sum, item) => sum + item.tvl, 0);

  return {
    period,
    asOf: computedAt.toISOString(),
    totalTvl,
    entries: insertRows.map((row) => ({
      rank: row.rank,
      wallet: row.wallet,
      displayName: walletAlias(row.wallet),
      apy: row.apyBps / 100,
      tvl: toNumber(row.tvl),
      change24h: row.changeBps / 100,
    })),
  };
}

export async function getLeaderboardSnapshot(
  period: LeaderboardPeriod,
  limit: number,
) {
  const latestTimestamp = await getLatestSnapshotTimestamp(period);

  if (
    !latestTimestamp ||
    Date.now() - latestTimestamp.getTime() > SNAPSHOT_STALE_MS
  ) {
    const fresh = await recomputeLeaderboardSnapshot(period);
    return {
      ...fresh,
      entries: fresh.entries.slice(0, limit),
    };
  }

  const rows = await db
    .select({
      rank: leaderboardCache.rank,
      wallet: leaderboardCache.wallet,
      apyBps: leaderboardCache.apyBps,
      tvl: leaderboardCache.tvl,
      changeBps: leaderboardCache.changeBps,
    })
    .from(leaderboardCache)
    .where(
      and(
        eq(leaderboardCache.period, period),
        eq(leaderboardCache.computedAt, latestTimestamp),
      ),
    )
    .orderBy(leaderboardCache.rank)
    .limit(limit);

  const totalTvl = rows.reduce((sum, row) => sum + toNumber(row.tvl), 0);

  return {
    period,
    asOf: latestTimestamp.toISOString(),
    totalTvl,
    entries: rows.map((row) => ({
      rank: row.rank,
      wallet: row.wallet,
      displayName: walletAlias(row.wallet),
      apy: row.apyBps / 100,
      tvl: toNumber(row.tvl),
      change24h: row.changeBps / 100,
    })),
  };
}

async function countRaceParticipants(raceId: string) {
  const countResult = await db
    .select({ value: sql<number>`count(*)` })
    .from(raceEntries)
    .where(eq(raceEntries.raceId, raceId));

  return toNumber(countResult[0]?.value ?? 0);
}

async function findActiveRace() {
  const rows = await db
    .select()
    .from(yieldRaces)
    .where(
      and(eq(yieldRaces.status, "active"), gt(yieldRaces.endsAt, new Date())),
    )
    .orderBy(desc(yieldRaces.startsAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function getOrCreateActiveRace() {
  const existing = await findActiveRace();
  if (existing) return existing;

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + 3 * 24 * 60 * 60 * 1000);

  await db.insert(yieldRaces).values({
    id: crypto.randomUUID(),
    period: "7d",
    entryFee: DEFAULT_ENTRY_FEE.toFixed(7),
    prizePool: "0",
    status: "active",
    startsAt,
    endsAt,
  });

  const created = await findActiveRace();
  if (!created) {
    throw new Error("Failed to initialize active race");
  }

  return created;
}

export async function getActiveRaceView(wallet?: string) {
  const race = await getOrCreateActiveRace();
  const participants = await countRaceParticipants(race.id);

  let joined = false;
  if (wallet) {
    const existing = await db
      .select({ id: raceEntries.id })
      .from(raceEntries)
      .where(
        and(eq(raceEntries.raceId, race.id), eq(raceEntries.wallet, wallet)),
      )
      .limit(1);

    joined = existing.length > 0;
  }

  return {
    id: race.id,
    period: race.period,
    entryFee: toNumber(race.entryFee),
    prizePool: toNumber(race.prizePool),
    status: parseRaceStatus(race.status),
    startsAt: race.startsAt.toISOString(),
    endsAt: race.endsAt.toISOString(),
    participants,
    joined,
  };
}

export async function joinRace(wallet: string, raceId?: string) {
  const race = raceId
    ? ((
        await db
          .select()
          .from(yieldRaces)
          .where(eq(yieldRaces.id, raceId))
          .limit(1)
      )[0] ?? null)
    : await getOrCreateActiveRace();

  if (!race) {
    throw new Error("Race not found");
  }

  if (race.status !== "active" || race.endsAt.getTime() <= Date.now()) {
    throw new Error("Race is not active");
  }

  await db.insert(users).values({ wallet }).onConflictDoNothing();

  const existing = await db
    .select({ id: raceEntries.id })
    .from(raceEntries)
    .where(and(eq(raceEntries.raceId, race.id), eq(raceEntries.wallet, wallet)))
    .limit(1);

  if (existing.length === 0) {
    const entryFee = toNumber(race.entryFee);
    await db.insert(raceEntries).values({
      id: crypto.randomUUID(),
      raceId: race.id,
      wallet,
      entryFee: entryFee.toFixed(7),
    });

    const currentPrizePool = toNumber(race.prizePool);
    const prizeContribution = entryFee * 0.8;
    const nextPrizePool = currentPrizePool + prizeContribution;

    await db
      .update(yieldRaces)
      .set({ prizePool: nextPrizePool.toFixed(7) })
      .where(eq(yieldRaces.id, race.id));
  }

  const raceView = await getActiveRaceView(wallet);

  return {
    joined: existing.length === 0,
    race: raceView,
  };
}

export async function warmLeaderboardSnapshots() {
  await Promise.all([
    recomputeLeaderboardSnapshot("7d"),
    recomputeLeaderboardSnapshot("30d"),
  ]);
}

export function startLeaderboardJob() {
  if (leaderboardTimer) return;

  void warmLeaderboardSnapshots().catch((err) => {
    logger.warn({ err }, "Leaderboard warm-up failed");
  });

  leaderboardTimer = setInterval(() => {
    void Promise.all([
      recomputeLeaderboardSnapshot("7d"),
      recomputeLeaderboardSnapshot("30d"),
    ]).catch((err) => {
      logger.warn({ err }, "Leaderboard recompute job failed");
    });
  }, RECOMPUTE_INTERVAL_MS);
}

export function stopLeaderboardJob() {
  if (!leaderboardTimer) return;
  clearInterval(leaderboardTimer);
  leaderboardTimer = null;
}
