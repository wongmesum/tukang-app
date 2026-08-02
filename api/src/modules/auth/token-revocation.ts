import jwt from "jsonwebtoken";

const FALLBACK_REVOCATION_SECONDS = 24 * 60 * 60;
const revokedTokens = new Map<string, number>();

function getTokenExpiryMs(token: string): number {
  const decoded = jwt.decode(token);
  if (typeof decoded === "object" && decoded?.exp) {
    return decoded.exp * 1000;
  }
  return Date.now() + FALLBACK_REVOCATION_SECONDS * 1000;
}

export function revokeToken(token: string): void {
  revokedTokens.set(token, getTokenExpiryMs(token));
}

export function isTokenRevoked(token: string): boolean {
  const expiresAt = revokedTokens.get(token);
  if (expiresAt === undefined) return false;

  if (expiresAt <= Date.now()) {
    revokedTokens.delete(token);
    return false;
  }

  return true;
}

export function clearRevokedTokens(): void {
  revokedTokens.clear();
}
