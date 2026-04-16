import "./env.js";
import Redis from "ioredis";
import { logger } from "./logger.js";
import { RedisChannels, type WalletEventMessage } from "./events.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error({ err }, "Redis error"));

// Connect on import
redis.connect().catch(() => {
  logger.warn("Redis not available — will retry on next request");
});

// ── Pub/Sub helpers (production-safe) ──
// Use a dedicated subscriber connection; ioredis recommends separate connections for pub/sub.
const subscriber = redis.duplicate();
subscriber.on("error", (err) => logger.error({ err }, "Redis subscriber error"));
subscriber.connect().catch(() => {
  logger.warn("Redis subscriber not available — will retry on next subscribe");
});

export async function publishWalletEvent(
  wallet: string,
  message: WalletEventMessage,
): Promise<void> {
  await redis.publish(RedisChannels.walletEvents(wallet), JSON.stringify(message));
}

export async function subscribeWalletEvents(
  wallet: string,
  handler: (message: WalletEventMessage) => void,
): Promise<() => Promise<void>> {
  const channel = RedisChannels.walletEvents(wallet);

  const onMessage = (ch: string, payload: string) => {
    if (ch !== channel) return;
    try {
      handler(JSON.parse(payload) as WalletEventMessage);
    } catch (err) {
      logger.warn({ err, wallet, channel }, "Invalid wallet event payload");
    }
  };

  subscriber.on("message", onMessage);
  await subscriber.subscribe(channel);

  return async () => {
    await subscriber.unsubscribe(channel);
    subscriber.off("message", onMessage);
  };
}
