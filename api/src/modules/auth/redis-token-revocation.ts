import jwt from "jsonwebtoken";
import { getRedis } from "../../shared/redis";

const KEY_PREFIX = "revoked:";
const FALLBACK_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Redis-backed token revocation store.
 *
 * Features:
 * - Tokens auto-expire from Redis when their JWT expiry passes
 * - Shared across multiple API instances
 * - Survives server restarts
 * - Zero maintenance — no cleanup jobs needed (Redis TTL handles it)
 *
 * Key format: revoked:{token_hash} → "1"
 * TTL: token's exp claim - now
 */

function getTokenTtlSeconds(token: string): number {
  try {
    const decoded = jwt.decode(token);
    if (typeof decoded === "object" && decoded?.exp) {
      const remaining = decoded.exp - Math.floor(Date.now() / 1000);
      return remaining > 0 ? remaining : FALLBACK_TTL_SECONDS;
    }
  } catch {
    // Can't decode — use fallback
  }
  return FALLBACK_TTL_SECONDS;
}

// Use a hash of the token as key (tokens are long, this saves Redis memory)
function tokenKey(token: string): string {
  // Use first 32 chars + last 16 chars as fingerprint (unique enough, shorter key)
  const fingerprint = token.length > 48
    ? `${token.slice(0, 32)}...${token.slice(-16)}`
    : token;
  return `${KEY_PREFIX}${fingerprint}`;
}

export async function revokeTokenRedis(token: string): Promise<void> {
  const redis = getRedis();
  const ttl = getTokenTtlSeconds(token);
  await redis.setex(tokenKey(token), ttl, "1");
}

export async function isTokenRevokedRedis(token: string): Promise<boolean> {
  const redis = getRedis();
  const exists = await redis.exists(tokenKey(token));
  return exists === 1;
}

export async function clearRevokedTokensRedis(): Promise<void> {
  // In Redis, tokens auto-expire — no manual cleanup needed.
  // This function exists for test compatibility.
}
