import { z } from "zod";

// ── Stellar ──

export const stellarAddressSchema = z
  .string()
  .length(56)
  .regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar public key");

// ── Auth ──

export const connectWalletSchema = z.object({
  wallet: stellarAddressSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── Positions ──

export const anchorSchema = z.object({
  principal: z.number().positive(),
  apy_bps: z.number().int().min(0).max(10000),
  sync_ts: z.number().positive(),
  box_id: z.string().min(1),
});

// ── Bond Boxes ──

export const bondBoxSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  risk: z.enum(["Low", "Medium", "High"]),
  apy_bps: z.number().int(),
  duration_years: z.number(),
  min_investment: z.number(),
  asset_type: z.enum(["Government", "Corporate", "Sovereign"]),
  flag: z.string(),
  accent_color: z.string().optional(),
  active: z.boolean().default(true),
});

// ── Deposits ──

export const depositSchema = z.object({
  box_id: z.string().min(1),
  amount: z.number().positive().min(1),
});

export const harvestSchema = z.object({
  box_id: z.string().min(1),
});

// ── Split Config ──

export const splitDestinationSchema = z.object({
  destination: stellarAddressSchema,
  label: z.string().max(50),
  percentage: z.number().int().min(1).max(100),
});

export const splitConfigSchema = z.object({
  splits: z
    .array(splitDestinationSchema)
    .min(1)
    .max(10)
    .refine(
      (d) => d.reduce((sum, dest) => sum + dest.percentage, 0) === 100,
      "Split percentages must sum to 100",
    ),
});

export const saveSplitConfigSchema = splitConfigSchema.extend({
  // Optional fallback for clients that do not use Authorization middleware yet.
  wallet: stellarAddressSchema.optional(),
});

// ── Feature 5: Leaderboard / Race ──

export const leaderboardPeriodSchema = z.enum(["7d", "30d"]);

export const leaderboardQuerySchema = z.object({
  period: leaderboardPeriodSchema.default("7d"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const raceJoinSchema = z.object({
  raceId: z.string().uuid().optional(),
});

// ── Mandates (COND agent settings) ──

export const mandateSchema = z.object({
  risk_tolerance: z.enum(["Conservative", "Moderate", "Aggressive"]),
  auto_compound: z.boolean(),
  compound_threshold_cents: z.number().int().min(100).default(5000),
  min_credit_rating: z.enum(["AAA", "AA", "A", "BBB"]).default("A"),
});

export const agentChatSchema = z.object({
  message: z.string().min(1).max(500),
});

export const killSwitchSchema = z.object({
  paused: z.boolean(),
});

export const updateMandateSchema = mandateSchema
  .partial()
  .extend({ paused: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

// ── Feature 4: Yield NFTs ──

export const nftMintSchema = z.object({
  box_id: z.string().min(1),
  notional: z.number().positive().min(1),
  duration_days: z.number().int().min(1).max(3650).default(365),
});

export const nftRedeemSchema = z.object({
  nft_id: z.string().uuid(),
});

export const nftTransferSchema = z.object({
  nft_id: z.string().uuid(),
  to_wallet: stellarAddressSchema,
});

// ── Feature 5: Social Copy ──

export const copyPortfolioSchema = z.object({
  leader_wallet: stellarAddressSchema,
});

// ── Feature 7: Creator Pools ──

export const creatorPoolJoinSchema = z.object({
  deposit_amount: z.number().nonnegative().default(0),
});

// ── WebSocket Messages ──

export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ANCHOR_UPDATE"),
    data: anchorSchema,
  }),
  z.object({
    type: z.literal("HARVEST_COMPLETE"),
    data: z.object({
      amount: z.number(),
      tx_hash: z.string(),
    }),
  }),
  z.object({
    type: z.literal("COND_ACTION"),
    data: z.object({
      action: z.string(),
      reasoning: z.string(),
      confidence: z.number(),
    }),
  }),
  z.object({
    type: z.literal("APY_UPDATE"),
    data: z.object({
      box_id: z.string(),
      new_apy_bps: z.number(),
    }),
  }),
]);

// ── Feature 6: Internal execution boundary ──
export const internalTxActionSchema = z.enum([
  "harvest",
  "rebalance",
  "rotate",
  "notify",
]);

export const internalTxRequestSchema = z.object({
  wallet: stellarAddressSchema,
  action: internalTxActionSchema,
  dry_run: z.boolean().default(true),
  // Rule-engine / agent-specific params; kept as JSON for forward compatibility.
  params: z.record(z.unknown()).default({}),
  // Request metadata for replay protection + audit
  request_nonce: z.string().min(16).max(128),
  request_ts: z.string().datetime(),
});

/** Signed body for Python / COND service to pull eligible wallets + mandates + positions. */
export const internalCondSnapshotRequestSchema = z.object({
  request_nonce: z.string().min(16).max(128),
  request_ts: z.string().datetime(),
});

// ── Export types ──

export type StellarAddress = z.infer<typeof stellarAddressSchema>;
export type ConnectWallet = z.infer<typeof connectWalletSchema>;
export type Anchor = z.infer<typeof anchorSchema>;
export type BondBox = z.infer<typeof bondBoxSchema>;
export type Deposit = z.infer<typeof depositSchema>;
export type Harvest = z.infer<typeof harvestSchema>;
export type SplitConfig = z.infer<typeof splitConfigSchema>;
export type SaveSplitConfig = z.infer<typeof saveSplitConfigSchema>;
export type LeaderboardPeriod = z.infer<typeof leaderboardPeriodSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
export type RaceJoin = z.infer<typeof raceJoinSchema>;
export type Mandate = z.infer<typeof mandateSchema>;
export type AgentChat = z.infer<typeof agentChatSchema>;
export type KillSwitch = z.infer<typeof killSwitchSchema>;
export type UpdateMandate = z.infer<typeof updateMandateSchema>;
export type NftMint = z.infer<typeof nftMintSchema>;
export type NftRedeem = z.infer<typeof nftRedeemSchema>;
export type NftTransfer = z.infer<typeof nftTransferSchema>;
export type CopyPortfolio = z.infer<typeof copyPortfolioSchema>;
export type WSMessage = z.infer<typeof wsMessageSchema>;
