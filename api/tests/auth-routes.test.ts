import { describe, expect, it } from "vitest";
import app from "../src/index";
import { generateTokenPair } from "../src/modules/auth/jwt";
import { userRepo } from "../src/modules/users/repository";

async function createTestAuthHeader(): Promise<string> {
  const user = await userRepo.create({
    phone: `08${Date.now().toString().slice(-10)}`,
    name: "Test User",
    role: "customer",
  });
  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  return `Bearer ${tokens.token}`;
}

describe("auth routes", () => {
  it("POST /v1/auth/otp/request — validates phone format", async () => {
    const res = await app.request("/v1/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "123" }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /v1/auth/otp/request — success with valid phone", async () => {
    const res = await app.request("/v1/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "081234567890" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.phone).toBe("081234567890");
    expect(json.data.expires_in).toBe(300);
  });

  it("POST /v1/auth/otp/verify — rejects missing record", async () => {
    const res = await app.request("/v1/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "089999999999", code: "111111" }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_OTP");
  });

  it("POST /v1/auth/otp/verify — rejects wrong code", async () => {
    // Request OTP first
    await app.request("/v1/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "081111111111" }),
    });

    const res = await app.request("/v1/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "081111111111", code: "000000" }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_OTP");
  });

  it("GET /health — returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("ok");
  });

  it("POST /v1/auth/register — rejects without token", async () => {
    const res = await app.request("/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /v1/auth/register — validates input with token", async () => {
    const auth = await createTestAuthHeader();
    const res = await app.request("/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ name: "" }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /v1/auth/register — success with valid name and token", async () => {
    const auth = await createTestAuthHeader();
    const res = await app.request("/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ name: "Ahmad Tukang" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.name).toBe("Ahmad Tukang");
  });
});
