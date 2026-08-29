import jwt from "jsonwebtoken";
import { redis } from "../../shared/redis";
import { env } from "../../config/env";

const FALLBACK_REVOCATION_SECONDS = 24 * 60 * 60;
const REVOKED_KEY_PREFIX = "revoked:";

// --- In-memory store (used for tests and when Redis is unavailable) ---

const revokedTokensMap = new Map<string, number>();

function getTokenTtlSeconds(token: string): number {
  const decoded = jwt.decode(token);
  if (typeof decoded === "object" && decoded?.exp) {
    const remaining = decoded.exp - Math.floor(Date.now() / 1000);
    return Math.max(remaining, 1);
  }
  return FALLBACK_REVOCATION_SECONDS;
}

// --- Public API ---

export async function revokeToken(token: string): Promise<void> {
  const ttlSeconds = getTokenTtlSeconds(token);

  // Keep a process-local copy for the current instance and as the explicit
  // cPanel fallback when Redis is optional.
  revokedTokensMap.set(token, Date.now() + ttlSeconds * 1000);

  if (redis && env.NODE_ENV !== "test") {
    const key = `${REVOKED_KEY_PREFIX}${hashToken(token)}`;
    try {
      await redis.set(key, "1", "EX", ttlSeconds);
    } catch (error) {
      if (env.REDIS_REQUIRED) throw error;
    }
  }
}

export function isTokenRevoked(token: string): boolean {
  // Synchronous check: always check in-memory first (fast path)
  const inMemoryExpiry = revokedTokensMap.get(token);
  if (inMemoryExpiry !== undefined) {
    if (inMemoryExpiry <= Date.now()) {
      revokedTokensMap.delete(token);
      return false;
    }
    return true;
  }

  // For Redis-backed revocation, we use an async check helper.
  // Since this function is sync, we can't await Redis here.
  // The middleware will use isTokenRevokedAsync for the actual check.
  return false;
}

/**
 * Async version for middleware use — checks both in-memory and Redis.
 */
export async function isTokenRevokedAsync(token: string): Promise<boolean> {
  // Check in-memory first
  const inMemoryExpiry = revokedTokensMap.get(token);
  if (inMemoryExpiry !== undefined) {
    if (inMemoryExpiry <= Date.now()) {
      revokedTokensMap.delete(token);
      return false;
    }
    return true;
  }

  // Check Redis if available
  if (redis && env.NODE_ENV !== "test") {
    try {
      const key = `${REVOKED_KEY_PREFIX}${hashToken(token)}`;
      const exists = await redis.exists(key);
      if (exists) {
        // Cache in memory for subsequent sync checks this request
        const ttl = await redis.ttl(key);
        revokedTokensMap.set(token, Date.now() + ttl * 1000);
        return true;
      }
    } catch (error) {
      if (env.REDIS_REQUIRED) throw error;
      // Redis unavailable — rely on in-memory only
    }
  }

  return false;
}

export function clearRevokedTokens(): void {
  revokedTokensMap.clear();
}

/**
 * Simple hash to shorten the Redis key (tokens are long JWTs).
 * Uses the last 32 chars of the token as a fingerprint.
 */
function hashToken(token: string): string {
  return token.slice(-32);
}
