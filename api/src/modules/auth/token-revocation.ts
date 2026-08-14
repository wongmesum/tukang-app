import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { revokeTokenRedis, isTokenRevokedRedis, clearRevokedTokensRedis } from "./redis-token-revocation";

const FALLBACK_REVOCATION_SECONDS = 24 * 60 * 60;
const revokedTokens = new Map<string, number>();

// --- In-memory implementation ---

function getTokenExpiryMs(token: string): number {
  const decoded = jwt.decode(token);
  if (typeof decoded === "object" && decoded?.exp) {
    return decoded.exp * 1000;
  }
  return Date.now() + FALLBACK_REVOCATION_SECONDS * 1000;
}

function revokeTokenMemory(token: string): void {
  revokedTokens.set(token, getTokenExpiryMs(token));
}

function isTokenRevokedMemory(token: string): boolean {
  const expiresAt = revokedTokens.get(token);
  if (expiresAt === undefined) return false;

  if (expiresAt <= Date.now()) {
    revokedTokens.delete(token);
    return false;
  }

  return true;
}

// --- Unified API (picks Redis when available) ---

const useRedis = env.NODE_ENV !== "test" && !!env.REDIS_URL;

export function revokeToken(token: string): void {
  if (useRedis) {
    // Fire-and-forget (async but we don't await in sync context)
    revokeTokenRedis(token).catch(() => {
      // Fallback to memory if Redis fails
      revokeTokenMemory(token);
    });
    // Also keep in memory for immediate consistency within this instance
    revokeTokenMemory(token);
  } else {
    revokeTokenMemory(token);
  }
}

export function isTokenRevoked(token: string): boolean {
  // Check memory first (fast path, covers current instance)
  if (isTokenRevokedMemory(token)) return true;

  if (useRedis) {
    // For sync middleware compatibility, we check memory.
    // The Redis check happens via the async wrapper below.
    // In a production setup with multiple instances, use the async version.
    return false;
  }

  return false;
}

/**
 * Async version for use in middleware that can await.
 * Checks both in-memory and Redis.
 */
export async function isTokenRevokedAsync(token: string): Promise<boolean> {
  if (isTokenRevokedMemory(token)) return true;

  if (useRedis) {
    return isTokenRevokedRedis(token);
  }

  return false;
}

export function clearRevokedTokens(): void {
  revokedTokens.clear();
  if (useRedis) {
    clearRevokedTokensRedis().catch(() => {});
  }
}
