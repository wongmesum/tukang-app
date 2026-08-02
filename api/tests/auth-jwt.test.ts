import { describe, expect, it } from "vitest";
import { generateTokenPair, verifyToken } from "../src/modules/auth/jwt";

describe("jwt", () => {
  it("generates token pair for payload", () => {
    const tokens = generateTokenPair({ userId: "user-1", role: "customer" });
    expect(tokens.token.length).toBeGreaterThan(20);
    expect(tokens.refreshToken.length).toBeGreaterThan(20);
    expect(tokens.token).not.toBe(tokens.refreshToken);
  });

  it("verifies a valid token and returns payload", () => {
    const tokens = generateTokenPair({ userId: "user-1", role: "worker" });
    const payload = verifyToken(tokens.token);
    expect(payload.userId).toBe("user-1");
    expect(payload.role).toBe("worker");
  });

  it("throws when verifying tampered token", () => {
    const tokens = generateTokenPair({ userId: "user-1", role: "admin" });
    const tampered = `${tokens.token.slice(0, -3)}abc`;
    expect(() => verifyToken(tampered)).toThrow();
  });
});
