export const RedisChannels = {
  walletEvents(wallet: string) {
    return `conduit:events:${wallet}`;
  },
  oracleUpdates: "conduit:oracle:update",
} as const;

export type WalletEventMessage =
  | { type: "ANCHOR_UPDATE"; data: unknown }
  | { type: "HARVEST_COMPLETE"; data: unknown }
  | { type: "COND_ACTION"; data: unknown }
  | { type: "RACE_UPDATE"; data: unknown }
  | { type: "SYSTEM"; data: unknown };

