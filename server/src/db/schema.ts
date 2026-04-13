import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Enums ──

export const kycStatusEnum = pgEnum("kyc_status", [
  "none",
  "pending",
  "approved",
  "rejected",
]);
export const riskEnum = pgEnum("risk_level", ["Low", "Medium", "High"]);
export const assetTypeEnum = pgEnum("asset_type", [
  "Government",
  "Corporate",
  "Sovereign",
]);
export const riskToleranceEnum = pgEnum("risk_tolerance", [
  "Conservative",
  "Moderate",
  "Aggressive",
]);
export const creditRatingEnum = pgEnum("credit_rating", [
  "AAA",
  "AA",
  "A",
  "BBB",
]);

// ── Users ──

export const users = pgTable("users", {
  wallet: text("wallet").primaryKey(),
  kycStatus: kycStatusEnum("kyc_status").default("none").notNull(),
  kycHash: text("kyc_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Bond Boxes ──

export const bondBoxes = pgTable("bond_boxes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  risk: riskEnum("risk").notNull(),
  apyBps: integer("apy_bps").notNull(), // basis points, e.g. 521 = 5.21%
  durationYears: integer("duration_years").notNull(),
  minInvestment: integer("min_investment").notNull(), // in cents
  assetType: assetTypeEnum("asset_type").notNull(),
  flag: text("flag").notNull(),
  accentColor: text("accent_color"),
  active: boolean("active").default(true).notNull(),
  contractId: text("contract_id"), // Soroban contract address
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Positions (user holdings) ──

export const positions = pgTable("positions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  wallet: text("wallet")
    .notNull()
    .references(() => users.wallet),
  boxId: text("box_id")
    .notNull()
    .references(() => bondBoxes.id),
  principal: numeric("principal", { precision: 20, scale: 7 }).notNull(),
  apyBps: integer("apy_bps").notNull(),
  syncTs: numeric("sync_ts", { precision: 20, scale: 6 }).notNull(), // unix timestamp
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Split Configs ──

export const splitConfigs = pgTable("split_configs", {
  wallet: text("wallet")
    .primaryKey()
    .references(() => users.wallet),
  splits: jsonb("splits")
    .$type<Array<{ destination: string; label: string; percentage: number }>>()
    .notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Mandates (COND agent preferences) ──

export const mandates = pgTable("mandates", {
  wallet: text("wallet")
    .primaryKey()
    .references(() => users.wallet),
  riskTolerance: riskToleranceEnum("risk_tolerance")
    .default("Moderate")
    .notNull(),
  autoCompound: boolean("auto_compound").default(true).notNull(),
  compoundThresholdCents: integer("compound_threshold_cents")
    .default(5000)
    .notNull(),
  minCreditRating: creditRatingEnum("min_credit_rating").default("A").notNull(),
  paused: boolean("paused").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -- TIMESCALE_GUARDED
// ── Harvest History (PostgreSQL-compatible table) ──

export const harvests = pgTable("harvests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  wallet: text("wallet")
    .notNull()
    .references(() => users.wallet),
  boxId: text("box_id")
    .notNull()
    .references(() => bondBoxes.id),
  amount: numeric("amount", { precision: 20, scale: 7 }).notNull(),
  txHash: text("tx_hash"),
  harvestedAt: timestamp("harvested_at").defaultNow().notNull(),
});

// -- TIMESCALE_GUARDED
// ── APY History (PostgreSQL-compatible table) ──

export const apyHistory = pgTable("apy_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  boxId: text("box_id")
    .notNull()
    .references(() => bondBoxes.id),
  apyBps: integer("apy_bps").notNull(),
  source: text("source").notNull(), // 'reflector' | 'benji' | 'manual'
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// ── Compliance Log ──

export const complianceLogs = pgTable("compliance_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  wallet: text("wallet").notNull(),
  action: text("action").notNull(), // 'kyc_check' | 'sanction_check' | 'attestation_write'
  result: text("result").notNull(), // 'pass' | 'fail' | 'error'
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── COND Decisions ──

export const condDecisions = pgTable("cond_decisions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  wallet: text("wallet")
    .notNull()
    .references(() => users.wallet),
  action: text("action").notNull(),
  reasoning: text("reasoning").notNull(),
  confidence: numeric("confidence", { precision: 4, scale: 3 }),
  executed: boolean("executed").default(false).notNull(),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Internal Tx Audit (Feature 6 execution boundary) ──
export const internalTxAudits = pgTable(
  "internal_tx_audits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    wallet: text("wallet").notNull(),
    action: text("action").notNull(),
    requestNonce: text("request_nonce").notNull(),
    requestTs: timestamp("request_ts").notNull(),
    requestBody: jsonb("request_body").notNull(),
    signature: text("signature").notNull(),
    dryRun: boolean("dry_run").default(true).notNull(),
    result: text("result").notNull(), // 'accepted' | 'rejected' | 'error'
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    nonceUnique: uniqueIndex("internal_tx_audits_request_nonce_idx").on(
      table.requestNonce,
    ),
    walletCreatedIdx: index("internal_tx_audits_wallet_created_idx").on(
      table.wallet,
      table.createdAt,
    ),
  }),
);

// ── Leaderboard Snapshots (Feature 5) ──

export const leaderboardCache = pgTable(
  "leaderboard_cache",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    period: text("period").notNull(), // '7d' | '30d'
    wallet: text("wallet")
      .notNull()
      .references(() => users.wallet),
    rank: integer("rank").notNull(),
    apyBps: integer("apy_bps").notNull(),
    tvl: numeric("tvl", { precision: 20, scale: 7 }).notNull(),
    changeBps: integer("change_bps").default(0).notNull(),
    computedAt: timestamp("computed_at").defaultNow().notNull(),
  },
  (table) => ({
    periodComputedIdx: index("leaderboard_cache_period_computed_idx").on(
      table.period,
      table.computedAt,
    ),
    periodRankIdx: index("leaderboard_cache_period_rank_idx").on(
      table.period,
      table.rank,
    ),
  }),
);

// ── Yield Races (Feature 5) ──

export const yieldRaces = pgTable("yield_races", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  period: text("period").default("7d").notNull(),
  entryFee: numeric("entry_fee", { precision: 20, scale: 7 })
    .default("5.0000000")
    .notNull(),
  prizePool: numeric("prize_pool", { precision: 20, scale: 7 })
    .default("0")
    .notNull(),
  status: text("status").default("active").notNull(), // active | closed
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const raceEntries = pgTable(
  "race_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    raceId: text("race_id")
      .notNull()
      .references(() => yieldRaces.id),
    wallet: text("wallet")
      .notNull()
      .references(() => users.wallet),
    entryFee: numeric("entry_fee", { precision: 20, scale: 7 }).notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    raceWalletUnique: uniqueIndex("race_entries_race_wallet_idx").on(
      table.raceId,
      table.wallet,
    ),
  }),
);

// ── Feature 4: Yield NFTs ──

export const yieldNfts = pgTable(
  "yield_nfts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerWallet: text("owner_wallet")
      .notNull()
      .references(() => users.wallet),
    boxId: text("box_id")
      .notNull()
      .references(() => bondBoxes.id),
    notional: numeric("notional", { precision: 20, scale: 7 }).notNull(),
    yieldBps: integer("yield_bps").notNull(),
    durationDays: integer("duration_days").notNull(),
    status: text("status").default("active").notNull(), // active | redeemed | transferred
    txHash: text("tx_hash"),
    mintedAt: timestamp("minted_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    ownerStatusIdx: index("yield_nfts_owner_status_idx").on(
      table.ownerWallet,
      table.status,
    ),
  }),
);

// ── Feature 5: Copy Portfolios ──

export const portfolioCopies = pgTable(
  "portfolio_copies",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    followerWallet: text("follower_wallet")
      .notNull()
      .references(() => users.wallet),
    leaderWallet: text("leader_wallet")
      .notNull()
      .references(() => users.wallet),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    followerLeaderUnique: uniqueIndex(
      "portfolio_copies_follower_leader_idx",
    ).on(table.followerWallet, table.leaderWallet),
    leaderActiveIdx: index("portfolio_copies_leader_active_idx").on(
      table.leaderWallet,
      table.active,
    ),
  }),
);

// ── Feature 7: Creator Pools (off-chain demo layer) ──

export const creatorPools = pgTable(
  "creator_pools",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    creatorWallet: text("creator_wallet")
      .notNull()
      .references(() => users.wallet),
    boxId: text("box_id")
      .notNull()
      .references(() => bondBoxes.id),
    creatorShareBps: integer("creator_share_bps").default(1000).notNull(), // 1000 = 10%
    fanApyHintBps: integer("fan_apy_hint_bps"),
    tone: text("tone"),
    blurb: text("blurb"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    activeIdx: index("creator_pools_active_idx").on(table.active, table.createdAt),
  }),
);

export const creatorPoolMemberships = pgTable(
  "creator_pool_memberships",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    poolId: text("pool_id")
      .notNull()
      .references(() => creatorPools.id, { onDelete: "cascade" }),
    fanWallet: text("fan_wallet")
      .notNull()
      .references(() => users.wallet),
    depositAmount: numeric("deposit_amount", { precision: 20, scale: 7 })
      .default("0")
      .notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    poolFanUnique: uniqueIndex("creator_pool_memberships_pool_fan_idx").on(
      table.poolId,
      table.fanWallet,
    ),
    poolJoinedIdx: index("creator_pool_memberships_pool_idx").on(
      table.poolId,
      table.joinedAt,
    ),
  }),
);
