import { describe, expect, it } from "vitest";
import app from "../src/index";
import { generateTokenPair } from "../src/modules/auth/jwt";
import { userRepo } from "../src/modules/users/repository";

async function createUserAuth(role: "customer" | "worker") {
  const user = await userRepo.create({
    phone: `08${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100000)}`,
    name: `Test ${role}`,
    role,
  });
  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  return { user, auth: `Bearer ${tokens.token}` };
}

async function registerAndVerifyWorker(auth: string, userId: string, skills: string[]) {
  await app.request("/v1/worker/register", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      ktp_number: "3216012345678901",
      ktp_photo_url: "https://cdn.tukangndeso.id/ktp/sample.jpg",
      bio: null,
      work_radius_km: 25,
      home_location: { lat: -7.4722, lng: 112.4336 },
      skills,
    }),
  });

  // Admin bypass
  const adminUser = await userRepo.create({
    phone: `08${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100000)}`,
    name: "Admin Helper",
    role: "admin",
  });
  const adminAuth = `Bearer ${generateTokenPair({ userId: adminUser.id, role: adminUser.role }).token}`;

  await app.request(`/v1/admin/workers/${userId}/verify`, {
    method: "POST",
    headers: { Authorization: adminAuth },
  });

  await app.request("/v1/worker/availability", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ is_available: true }),
  });
}

async function createOrder(auth: string, serviceId = "seed-AC-cuci-ac-split") {
  const res = await app.request("/v1/orders", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      pricing_scheme: "hourly",
      estimated_duration: 2,
      description: "Test matching",
      photos: [],
      address_id: "addr-matching",
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
  return (await res.json()).data;
}

describe("matching routes", () => {
  it("POST /v1/matching/find — rejects without token", async () => {
    const res = await app.request("/v1/matching/find", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: "x" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /v1/matching/find — returns candidates matching category and radius", async () => {
    const customer = await createUserAuth("customer");
    const worker = await createUserAuth("worker");
    await registerAndVerifyWorker(worker.auth, worker.user.id, ["AC"]);

    const order = await createOrder(customer.auth);

    const res = await app.request("/v1/matching/find", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.category).toBe("AC");
    expect(json.data.candidates.some((c: { worker_id: string }) => c.worker_id === worker.user.id)).toBe(true);
  });

  it("POST /v1/matching/assign — assigns best candidate and transitions to MATCHED", async () => {
    const customer = await createUserAuth("customer");
    const worker = await createUserAuth("worker");
    const uniqueCategory = "ASGN";
    await registerAndVerifyWorker(worker.auth, worker.user.id, [uniqueCategory]);

    const order = await createOrder(customer.auth, `seed-${uniqueCategory}-cuci-ac`);

    const res = await app.request("/v1/matching/assign", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("MATCHED");
    expect(json.data.assigned_worker.worker_id).toBe(worker.user.id);

    // Worker can now see it in incoming
    const incomingRes = await app.request("/v1/worker/orders/incoming", {
      headers: { Authorization: worker.auth },
    });
    const incoming = (await incomingRes.json()).data;
    expect(incoming.some((o: { id: string }) => o.id === order.id)).toBe(true);
  });

  it("POST /v1/matching/assign — returns NO_WORKER_AVAILABLE when no candidates", async () => {
    const customer = await createUserAuth("customer");
    const order = await createOrder(customer.auth, "seed-NOMATCH-service");

    const res = await app.request("/v1/matching/assign", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("NO_WORKER_AVAILABLE");
  });

  it("POST /v1/matching/assign — rejects re-matching an already MATCHED order", async () => {
    const customer = await createUserAuth("customer");
    const worker = await createUserAuth("worker");
    await registerAndVerifyWorker(worker.auth, worker.user.id, ["AC"]);

    const order = await createOrder(customer.auth);
    await app.request("/v1/matching/assign", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });

    const secondRes = await app.request("/v1/matching/assign", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });
    expect(secondRes.status).toBe(409);
  });
});
