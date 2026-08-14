import type { StoredOtpRecord } from "./otp";
import type { OtpStore } from "./otp-store";
import { getRedis } from "../../shared/redis";

const KEY_PREFIX = "otp:";

/**
 * Redis-backed OTP store.
 *
 * Features:
 * - OTP records auto-expire via Redis TTL (no cleanup needed)
 * - Shared across multiple API instances (horizontal scaling)
 * - Survives server restarts
 *
 * Key format: otp:{phone} → JSON string of StoredOtpRecord
 * TTL: expiresAt - now (auto-expire when OTP expires)
 */
export class RedisOtpStore implements OtpStore {
  async get(phone: string): Promise<StoredOtpRecord | null> {
    const redis = getRedis();
    const data = await redis.get(`${KEY_PREFIX}${phone}`);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        expiresAt: new Date(parsed.expiresAt),
      } as StoredOtpRecord;
    } catch {
      // Corrupted data — delete and return null
      await redis.del(`${KEY_PREFIX}${phone}`);
      return null;
    }
  }

  async set(phone: string, record: StoredOtpRecord): Promise<void> {
    const redis = getRedis();
    const ttlSeconds = Math.max(
      1,
      Math.ceil((record.expiresAt.getTime() - Date.now()) / 1000),
    );

    const data = JSON.stringify({
      ...record,
      expiresAt: record.expiresAt.toISOString(),
    });

    await redis.setex(`${KEY_PREFIX}${phone}`, ttlSeconds, data);
  }

  async delete(phone: string): Promise<void> {
    const redis = getRedis();
    await redis.del(`${KEY_PREFIX}${phone}`);
  }
}
