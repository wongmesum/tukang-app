/**
 * Redis client singleton.
 *
 * Uses ioredis-compatible API. Falls back to null when REDIS_URL is not configured,
 * allowing modules to gracefully degrade to in-memory implementations.
 */

import { env } from "../config/env";

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: "EX", duration?: number): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  quit(): Promise<void>;
}

/**
 * Acquire a short-lived distributed lock.
 *
 * Used by background jobs so that only one API instance performs a sweep.
 * Without this, every instance would expire the same orders and send
 * duplicate notifications.
 *
 * Returns false when another holder already has the lock.
 */
export async function acquireLock(name: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedis();
  const key = `lock:${name}`;

  // ioredis supports SET key val EX ttl NX; the in-memory client emulates it.
  const client = redis as RedisClient & {
    set(k: string, v: string, ...args: unknown[]): Promise<string | null>;
  };

  try {
    const result = await client.set(key, "1", "EX", ttlSeconds, "NX");
    return result === "OK";
  } catch {
    // If locking is unavailable, let the caller proceed rather than
    // silently disabling the background job entirely.
    return true;
  }
}

export async function releaseLock(name: string): Promise<void> {
  try {
    await getRedis().del(`lock:${name}`);
  } catch {
    // Lock expires on its own via TTL.
  }
}

// --- In-memory Redis mock (for tests and local dev without Redis) ---

class InMemoryRedis implements RedisClient {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(
    key: string,
    value: string,
    mode?: "EX",
    duration?: number,
    ...flags: unknown[]
  ): Promise<string | null> {
    // Emulate the NX flag so distributed locks behave the same in-memory.
    if (flags.includes("NX")) {
      const existing = await this.get(key);
      if (existing !== null) return null;
    }
    const expiresAt = mode === "EX" && duration ? Date.now() + duration * 1000 : 0;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return 0;
    }
    return 1;
  }

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const current = entry ? parseInt(entry.value, 10) : 0;
    const next = current + 1;
    if (entry) {
      entry.value = String(next);
    } else {
      this.store.set(key, { value: String(next), expiresAt: 0 });
    }
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (entry.expiresAt === 0) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async quit(): Promise<void> {
    this.store.clear();
  }
}

// --- Singleton ---

let redisClient: RedisClient | null = null;

export function getRedis(): RedisClient {
  if (redisClient) return redisClient;

  // If REDIS_URL is configured, use real Redis
  if (env.REDIS_URL) {
    // Dynamic import to avoid bundling ioredis when not needed
    // In production, install: bun add ioredis
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Redis = require("ioredis");
      redisClient = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: true,
      }) as RedisClient;

      // eslint-disable-next-line no-console
      console.log("[Redis] Connected to", env.REDIS_URL.replace(/\/\/.*@/, "//***@"));
    } catch {
      // eslint-disable-next-line no-console
      console.warn("[Redis] ioredis not installed, using in-memory fallback");
      redisClient = new InMemoryRedis();
    }
  } else {
    // No Redis configured — use in-memory (suitable for single-instance dev)
    if (env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.log("[Redis] REDIS_URL not set, using in-memory store");
    }
    redisClient = new InMemoryRedis();
  }

  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
