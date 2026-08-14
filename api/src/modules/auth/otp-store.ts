import type { StoredOtpRecord } from "./otp";
import { env } from "../../config/env";
import { RedisOtpStore } from "./redis-otp-store";

export interface OtpStore {
  get(phone: string): Promise<StoredOtpRecord | null>;
  set(phone: string, record: StoredOtpRecord): Promise<void>;
  delete(phone: string): Promise<void>;
}

const CLEANUP_INTERVAL_MS = 60_000;

/**
 * In-memory OTP store — used for tests and single-instance development.
 */
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

/**
 * Factory: uses Redis in production/when REDIS_URL is set, in-memory otherwise.
 */
function createOtpStore(): OtpStore {
  if (env.NODE_ENV === "test") {
    return new InMemoryOtpStore();
  }
  if (env.REDIS_URL) {
    return new RedisOtpStore();
  }
  return new InMemoryOtpStore();
}

export const otpStore: OtpStore = createOtpStore();
