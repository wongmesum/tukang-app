import Redis from "ioredis";
import { env } from "../config/env";

/**
 * Shared Redis client.
 * Returns null in test mode (no real Redis needed for tests).
 * Suppresses repeated connection errors to avoid log spam.
 */
function createRedisClient(): Redis | null {
  if (env.NODE_ENV === "test") return null;

  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying after 3 attempts
      return Math.min(times * 500, 3000);
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  let errorLogged = false;

  client.on("error", (err) => {
    if (!errorLogged) {
      // eslint-disable-next-line no-console
      console.warn(`[Redis] Not available: ${err.message} (will use in-memory fallback)`);
      errorLogged = true;
    }
  });

  client.on("connect", () => {
    errorLogged = false;
    // eslint-disable-next-line no-console
    console.log("[Redis] Connected");
  });

  // Try to connect but don't block startup
  client.connect().catch(() => {
    // Error already logged via event
  });

  return client;
}

export const redis = createRedisClient();
