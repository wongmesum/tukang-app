import { describe, expect, it } from "vitest";
import app from "../src/index";
import { generateTokenPair } from "../src/modules/auth/jwt";
import { userRepo } from "../src/modules/users/repository";

async function createUserAndHeader() {
  const user = await userRepo.create({
    phone: `08${Date.now().toString().slice(-10)}`,
    name: "User Route Test",
    role: "customer",
  });
  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  return { user, auth: `Bearer ${tokens.token}` };
}

describe("users routes", () => {
  it("GET /v1/me — rejects without token", async () => {
    const res = await app.request("/v1/me");
    expect(res.status).toBe(401);
  });

  it("GET /v1/me — returns current user", async () => {
    const { user, auth } = await createUserAndHeader();
    const res = await app.request("/v1/me", {
      headers: { Authorization: auth },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(user.id);
    expect(json.data.phone).toBe(user.phone);
  });

  it("PATCH /v1/me — updates profile", async () => {
    const { auth } = await createUserAndHeader();
    const res = await app.request("/v1/me", {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nama Baru", email: "baru@example.com" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("Nama Baru");
    expect(json.data.email).toBe("baru@example.com");
  });

  it("POST /v1/me/addresses — creates address", async () => {
    const { auth } = await createUserAndHeader();
    const res = await app.request("/v1/me/addresses", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Rumah",
        full_address: "Jl. Majapahit No. 1",
        lat: -7.4722,
        lng: 112.4336,
        district: "Mojosari",
        city: "Mojokerto",
        is_default: true,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.label).toBe("Rumah");
    expect(json.data.is_default).toBe(true);
  });

  it("GET /v1/me/addresses — lists addresses", async () => {
    const { auth } = await createUserAndHeader();

    await app.request("/v1/me/addresses", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Rumah",
        full_address: "Jl. Majapahit No. 2",
        lat: -7.4722,
        lng: 112.4336,
        district: "Mojosari",
        city: "Mojokerto",
        is_default: true,
      }),
    });

    const res = await app.request("/v1/me/addresses", {
      headers: { Authorization: auth },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(1);
  });
});
