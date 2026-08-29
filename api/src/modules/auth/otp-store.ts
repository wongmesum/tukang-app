import type { StoredOtpRecord } from "./otp";
import { redis } from "../../shared/redis";
import { env } from "../../config/env";

export interface OtpStore {
  get(phone: string): Promise<StoredOtpRecord | null>;
  set(phone: string, record: StoredOtpRecord): Promise<void>;
  delete(phone: string): Promise<void>;
}

const OTP_KEY_PREFIX = "otp:";
const CLEANUP_INTERVAL_MS = 60_000;

// --- In-Memory implementation (for tests and fallback) ---

export class InMemoryOtpStore implements OtpStore {
  private readonly records = new Map<string, StoredOtpRecord>();
  private lastCleanup = Date.now();

  async get(phone: string): Promise<StoredOtpRecord | null> {
    this.cleanupExpired();
    return this.records.get(phone) ?? null;
  }

  async set(phone: string, record: StoredOtpRecord): Promise<void> {
    this.records.set(phone, record);
  }

  async delete(phone: string): Promise<void> {
    this.records.delete(phone);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    if (now - this.lastCleanup < CLEANUP_INTERVAL_MS) return;
    this.lastCleanup = now;

    for (const [phone, record] of this.records.entries()) {
      if (now > record.expiresAt.getTime()) {
        this.records.delete(phone);
      }
    }
  }
}

// --- Redis with in-memory fallback (graceful degradation) ---

/**
 * Tries Redis first, falls back to in-memory if Redis is unavailable.
 * This ensures the app works even without Redis running.
 */
export class ResilientOtpStore implements OtpStore {
  private readonly memoryFallback = new InMemoryOtpStore();

  async get(phone: string): Promise<StoredOtpRecord | null> {
    // Try Redis
    if (redis) {
      try {
        const data = await redis.get(`${OTP_KEY_PREFIX}${phone}`);
        if (data) {
          const parsed = JSON.parse(data) as {
            phone: string;
            code: string;
            expiresAt: string;
            attempts: number;
          };
          return {
            phone: parsed.phone,
            code: parsed.code,
            expiresAt: new Date(parsed.expiresAt),
            attempts: parsed.attempts,
          };
        }
      } catch (error) {
        if (env.REDIS_REQUIRED) throw error;
        // Redis unavailable, try memory fallback
      }
    }

    return this.memoryFallback.get(phone);
  }

  async set(phone: string, record: StoredOtpRecord): Promise<void> {
    // Always store in memory as fallback
    await this.memoryFallback.set(phone, record);

    // Try Redis (fire-and-forget style, don't throw)
    if (redis) {
      try {
        const ttlSeconds = Math.max(
          1,
          Math.ceil((record.expiresAt.getTime() - Date.now()) / 1000),
        );

        const data = JSON.stringify({
          phone: record.phone,
          code: record.code,
          expiresAt: record.expiresAt.toISOString(),
          attempts: record.attempts,
        });

        await redis.set(`${OTP_KEY_PREFIX}${phone}`, data, "EX", ttlSeconds);
      } catch (error) {
        if (env.REDIS_REQUIRED) throw error;
        // Redis unavailable — memory fallback already has the data
      }
    }
  }

  async delete(phone: string): Promise<void> {
    await this.memoryFallback.delete(phone);

    if (redis) {
      try {
        await redis.del(`${OTP_KEY_PREFIX}${phone}`);
      } catch (error) {
        if (env.REDIS_REQUIRED) throw error;
        // ignore
      }
    }
  }
}

// --- Factory ---

function createOtpStore(): OtpStore {
  if (env.NODE_ENV === "test") {
    return new InMemoryOtpStore();
  }
  // Always use resilient store in dev/production — works with or without Redis
  return new ResilientOtpStore();
}

export const otpStore: OtpStore = createOtpStore();
