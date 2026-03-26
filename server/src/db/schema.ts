import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
  jsonb,
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Harvest History (TimescaleDB hypertable) ──

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

// ── APY History (TimescaleDB hypertable) ──

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
