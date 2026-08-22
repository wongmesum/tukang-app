import Redis from "ioredis";
import { env } from "../config/env";
import { getRedisSettings, type RedisSettings } from "../modules/settings/config-store";

let redisClient: Redis | null = null;
let activeUrl = "";

function attachLogging(client: Redis): void {
  let errorLogged = false;
  client.on("error", (error) => {
    if (!errorLogged) {
      console.warn(`[Redis] Not available: ${error.message} (using memory fallback)`);
      errorLogged = true;
    }
  });
  client.on("connect", () => {
    errorLogged = false;
    console.log("[Redis] Connected");
  });
}

export function getRedisClient(): Redis | null {
  return redisClient;
}

export async function reconfigureRedis(
  settings: RedisSettings = getRedisSettings(),
): Promise<Redis | null> {
  if (env.NODE_ENV === "test" || !settings.enabled || !settings.url) {
    if (redisClient) await redisClient.quit().catch(() => redisClient?.disconnect());
    redisClient = null;
    activeUrl = "";
    return null;
  }

  if (redisClient && activeUrl === settings.url) return redisClient;
  if (redisClient) await redisClient.quit().catch(() => redisClient?.disconnect());

  const client = new Redis(settings.url, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 3000)),
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  attachLogging(client);

  try {
    await client.connect();
    await client.ping();
    redisClient = client;
    activeUrl = settings.url;
    return client;
  } catch {
    client.disconnect();
    redisClient = null;
    activeUrl = "";
    return null;
  }
}

if (env.NODE_ENV !== "test") {
  void reconfigureRedis();
}
