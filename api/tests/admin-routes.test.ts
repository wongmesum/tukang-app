import { describe, expect, it } from "vitest";
import app from "../src/index";
import { generateTokenPair } from "../src/modules/auth/jwt";
import { userRepo } from "../src/modules/users/repository";

async function createAdminAuth() {
  const user = await userRepo.create({
    phone: `08${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100000)}`,
    name: "Admin Dev",
    role: "admin",
  });
  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  return { user, auth: `Bearer ${tokens.token}` };
}

async function createWorkerAuth() {
  const user = await userRepo.create({
    phone: `08${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100000)}`,
    name: "Test Worker",
    role: "worker",
  });
  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  return { user, auth: `Bearer ${tokens.token}` };
}

async function createCustomerAuth() {
  const user = await userRepo.create({
    phone: `08${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100000)}`,
    name: "Test Customer",
    role: "customer",
  });
  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  return { user, auth: `Bearer ${tokens.token}` };
}

async function registerWorker(auth: string) {
  await app.request("/v1/worker/register", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      ktp_number: "3216012345678901",
      ktp_photo_url: "https://cdn.tukangndeso.id/ktp/sample.jpg",
      bio: "Tukang test",
      work_radius_km: 20,
      home_location: { lat: -7.4722, lng: 112.4336 },
      skills: ["AC", "LST"],
    }),
  });
}

describe("admin routes", () => {
  it("rejects non-admin with 403", async () => {
    const customer = await createCustomerAuth();
    const res = await app.request("/v1/admin/workers/pending", {
      headers: { Authorization: customer.auth },
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("rejects unauthenticated with 401", async () => {
    const res = await app.request("/v1/admin/workers/pending");
    expect(res.status).toBe(401);
  });

  it("GET /v1/admin/workers/pending — lists pending workers", async () => {
    const admin = await createAdminAuth();
    const worker = await createWorkerAuth();
    await registerWorker(worker.auth);

    const res = await app.request("/v1/admin/workers/pending", {
      headers: { Authorization: admin.auth },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta.total).toBeGreaterThanOrEqual(1);
  });

  it("POST /v1/admin/workers/:id/verify — activates worker", async () => {
    const admin = await createAdminAuth();
    const worker = await createWorkerAuth();
    await registerWorker(worker.auth);

    const res = await app.request(`/v1/admin/workers/${worker.user.id}/verify`, {
      method: "POST",
      headers: { Authorization: admin.auth },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("active");
  });

  it("POST /v1/admin/workers/:id/suspend — suspends worker", async () => {
    const admin = await createAdminAuth();
    const worker = await createWorkerAuth();
    await registerWorker(worker.auth);

    await app.request(`/v1/admin/workers/${worker.user.id}/verify`, {
      method: "POST",
      headers: { Authorization: admin.auth },
    });

    const res = await app.request(`/v1/admin/workers/${worker.user.id}/suspend`, {
      method: "POST",
      headers: { Authorization: admin.auth },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("suspended");
  });

  it("POST /v1/admin/workers/:id/reactivate — reactivates suspended worker", async () => {
    const admin = await createAdminAuth();
    const worker = await createWorkerAuth();
    await registerWorker(worker.auth);

    await app.request(`/v1/admin/workers/${worker.user.id}/verify`, {
      method: "POST",
      headers: { Authorization: admin.auth },
    });
    await app.request(`/v1/admin/workers/${worker.user.id}/suspend`, {
      method: "POST",
      headers: { Authorization: admin.auth },
    });

    const res = await app.request(`/v1/admin/workers/${worker.user.id}/reactivate`, {
      method: "POST",
      headers: { Authorization: admin.auth },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("active");
  });

  it("GET /v1/admin/reports/summary — returns aggregated stats", async () => {
    const admin = await createAdminAuth();
    const res = await app.request("/v1/admin/reports/summary", {
      headers: { Authorization: admin.auth },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.workers).toBeDefined();
    expect(json.data.orders).toBeDefined();
    expect(json.data.revenue).toBeDefined();
  });

  it("POST /v1/admin/orders/:id/force-transition — validates transition", async () => {
    const admin = await createAdminAuth();
    const customer = await createCustomerAuth();

    // Create order
    const orderRes = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: "seed-AC-cuci-ac-split",
        pricing_scheme: "hourly",
        estimated_duration: 2,
        description: "Admin test",
        photos: [],
        address_id: "addr-admin",
        customer_location: { lat: -7.4722, lng: 112.4336 },
        scheduled_at: null,
        pricing: {
          base_rate: 60000,
          distance_km: 5,
          travel_cost: 5000,
          surcharge: { holiday: 0, night: 0, weekend: 0, urgent: 0, floor: 0 },
          total_estimate: 65000,
        },
      }),
    });
    const order = (await orderRes.json()).data;

    // Valid transition PENDING → EXPIRED
    const res = await app.request(`/v1/admin/orders/${order.id}/force-transition`, {
      method: "POST",
      headers: { Authorization: admin.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ to_status: "EXPIRED", note: "Timeout oleh admin" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("EXPIRED");
    expect(json.data.previous_status).toBe("PENDING");

    // Invalid transition from EXPIRED
    const badRes = await app.request(`/v1/admin/orders/${order.id}/force-transition`, {
      method: "POST",
      headers: { Authorization: admin.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ to_status: "PENDING" }),
    });
    expect(badRes.status).toBe(409);
  });
});
