import { describe, expect, it } from "vitest";
import app from "../src/index";
import { generateTokenPair } from "../src/modules/auth/jwt";
import { userRepo } from "../src/modules/users/repository";
import { workerRepo } from "../src/modules/workers/repository";

async function createUserAndHeader(role: "customer" | "worker" = "customer") {
  const user = await userRepo.create({
    phone: `08${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`,
    name: `Test ${role}`,
    role,
  });
  const tokens = generateTokenPair({ userId: user.id, role: user.role });

  if (role === "worker") {
    await workerRepo.create({
      userId: user.id,
      ktpNumber: "1234567890123456",
      ktpPhotoUrl: "http://example.com/ktp.jpg",
      bio: "Test Worker",
      workRadiusKm: 50,
      homeLocation: { lat: -7.4722, lng: 112.4336 },
      skills: ["AC"],
    });
    await workerRepo.update(user.id, { status: "active", isAvailable: true });
  }

  return { user, auth: `Bearer ${tokens.token}` };
}

function orderPayload() {
  return {
    service_id: "seed-AC-cuci-ac-split",
    pricing_scheme: "hourly",
    estimated_duration: 3,
    description: "AC bocor",
    photos: [],
    address_id: "addr-1",
    customer_location: { lat: -7.4722, lng: 112.4336 },
    scheduled_at: null,
    pricing: {
      base_rate: 90000,
      distance_km: 12,
      travel_cost: 12000,
      surcharge: { holiday: 0, night: 0, weekend: 0, urgent: 0, floor: 0 },
      total_estimate: 102000,
    },
  };
}

async function createAndCompleteOrder(customerAuth: string, workerAuth: string): Promise<string> {
  const createRes = await app.request("/v1/orders", {
    method: "POST",
    headers: { Authorization: customerAuth, "Content-Type": "application/json" },
    body: JSON.stringify(orderPayload()),
  });
  const orderId = (await createRes.json()).data.id as string;

  const actions = ["accept", "enroute", "arrive", "start", "complete"] as const;
  for (const action of actions) {
    const response = await app.request(`/v1/worker/orders/${orderId}/${action}`, {
      method: "POST",
      headers: { Authorization: workerAuth },
    });
    expect(response.status).toBe(200);
  }

  return orderId;
}

describe("orders routes", () => {
  it("POST /v1/orders — rejects without token", async () => {
    const res = await app.request("/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });
    expect(res.status).toBe(401);
  });

  it("POST /v1/orders — creates order with PENDING status", async () => {
    const { auth } = await createUserAndHeader("customer");
    const res = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("PENDING");
    expect(json.data.pricing.total_estimate).toBe(102000);
    expect(json.data.order_number).toMatch(/^ORD-\d{8}-[A-F0-9]{4}$/);
  });

  it("GET /v1/orders — lists customer orders", async () => {
    const { auth } = await createUserAndHeader("customer");
    await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });

    const res = await app.request("/v1/orders", { headers: { Authorization: auth } });
    const json = await res.json();
    expect(json.data.length).toBe(1);
  });

  it("full lifecycle: create → accept → enroute → arrive → start → complete", async () => {
    const customer = await createUserAndHeader("customer");
    const worker = await createUserAndHeader("worker");

    const createRes = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });
    const created = await createRes.json();
    const orderId = created.data.id;

    const acceptRes = await app.request(`/v1/worker/orders/${orderId}/accept`, {
      method: "POST",
      headers: { Authorization: worker.auth },
    });
    expect(acceptRes.status).toBe(200);
    const accepted = await acceptRes.json();
    expect(accepted.data.status).toBe("ACCEPTED");
    expect(accepted.data.worker_id).toBe(worker.user.id);

    // ACCEPTED → ARRIVED directly is not allowed; must go via EN_ROUTE
    const skipArriveRes = await app.request(`/v1/worker/orders/${orderId}/arrive`, {
      method: "POST",
      headers: { Authorization: worker.auth },
    });
    expect(skipArriveRes.status).toBe(409);

    const enrouteRes = await app.request(`/v1/worker/orders/${orderId}/enroute`, {
      method: "POST",
      headers: { Authorization: worker.auth },
    });
    expect(enrouteRes.status).toBe(200);
    expect((await enrouteRes.json()).data.status).toBe("EN_ROUTE");

    const arriveRes = await app.request(`/v1/worker/orders/${orderId}/arrive`, {
      method: "POST",
      headers: { Authorization: worker.auth },
    });
    expect(arriveRes.status).toBe(200);
    expect((await arriveRes.json()).data.status).toBe("ARRIVED");

    const startRes = await app.request(`/v1/worker/orders/${orderId}/start`, {
      method: "POST",
      headers: { Authorization: worker.auth },
    });
    expect(startRes.status).toBe(200);
    const started = await startRes.json();
    expect(started.data.status).toBe("IN_PROGRESS");
    expect(started.data.started_at).not.toBeNull();

    const completeRes = await app.request(`/v1/worker/orders/${orderId}/complete`, {
      method: "POST",
      headers: { Authorization: worker.auth },
    });
    expect(completeRes.status).toBe(200);
    const completed = await completeRes.json();
    expect(completed.data.status).toBe("COMPLETED");
    expect(completed.data.pricing.total_final).toBe(102000);
  });

  it("rejects illegal transition PENDING → accept twice (double booking)", async () => {
    const customer = await createUserAndHeader("customer");
    const worker1 = await createUserAndHeader("worker");
    const worker2 = await createUserAndHeader("worker");

    const createRes = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });
    const created = await createRes.json();
    const orderId = created.data.id;

    const firstAccept = await app.request(`/v1/worker/orders/${orderId}/accept`, {
      method: "POST",
      headers: { Authorization: worker1.auth },
    });
    expect(firstAccept.status).toBe(200);

    const secondAccept = await app.request(`/v1/worker/orders/${orderId}/accept`, {
      method: "POST",
      headers: { Authorization: worker2.auth },
    });
    expect(secondAccept.status).toBe(409);
    const json = await secondAccept.json();
    expect(json.error.code).toBe("CONFLICT");
  });

  it("POST /v1/orders/:id/cancel — customer can cancel PENDING order", async () => {
    const { auth } = await createUserAndHeader("customer");
    const createRes = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });
    const created = await createRes.json();

    const cancelRes = await app.request(`/v1/orders/${created.data.id}/cancel`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ reason_code: "changed_mind", reason_detail: "Berubah pikiran" }),
    });

    expect(cancelRes.status).toBe(200);
    const json = await cancelRes.json();
    expect(json.data.status).toBe("CANCELLED_BY_CUSTOMER");
  });

  it("GET /v1/orders/:id — returns 404 for other customer's order", async () => {
    const owner = await createUserAndHeader("customer");
    const stranger = await createUserAndHeader("customer");

    const createRes = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: owner.auth, "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });
    const created = await createRes.json();

    const res = await app.request(`/v1/orders/${created.data.id}`, {
      headers: { Authorization: stranger.auth },
    });
    expect(res.status).toBe(404);
  });

  it("POST /v1/worker/orders/:id/reject — worker rejects MATCHED order, order re-queues to PENDING", async () => {
    const customer = await createUserAndHeader("customer");
    const worker1 = await createUserAndHeader("worker");
    const worker2 = await createUserAndHeader("worker");

    const createRes = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });
    const created = await createRes.json();
    const orderId = created.data.id;

    // Simulate matching having assigned worker1 (MATCHED, not yet ACCEPTED)
    const matchRes = await app.request("/v1/matching/assign", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, worker_id: worker1.user.id }),
    });
    expect(matchRes.status).toBe(200);

    const rejectRes = await app.request(`/v1/worker/orders/${orderId}/reject`, {
      method: "POST",
      headers: { Authorization: worker1.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Terlalu jauh" }),
    });
    expect(rejectRes.status).toBe(200);
    const rejected = await rejectRes.json();
    expect(rejected.data.status).toBe("PENDING");
    expect(rejected.data.worker_id).toBeNull();

    // A different worker can now accept the re-queued order
    const acceptRes = await app.request(`/v1/worker/orders/${orderId}/accept`, {
      method: "POST",
      headers: { Authorization: worker2.auth },
    });
    expect(acceptRes.status).toBe(200);
    expect((await acceptRes.json()).data.worker_id).toBe(worker2.user.id);
  });

  it("POST /v1/worker/orders/:id/reject — rejects when order is not assigned to this worker", async () => {
    const customer = await createUserAndHeader("customer");
    const worker1 = await createUserAndHeader("worker");
    const worker2 = await createUserAndHeader("worker");

    const createRes = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });
    const orderId = (await createRes.json()).data.id;

    await app.request("/v1/matching/assign", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, worker_id: worker1.user.id }),
    });

    const rejectRes = await app.request(`/v1/worker/orders/${orderId}/reject`, {
      method: "POST",
      headers: { Authorization: worker2.auth, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(rejectRes.status).toBe(404);
  });

  it("POST /v1/worker/orders/:id/reject — rejects transition from ACCEPTED (already accepted)", async () => {
    const customer = await createUserAndHeader("customer");
    const worker = await createUserAndHeader("worker");

    const createRes = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });
    const orderId = (await createRes.json()).data.id;

    await app.request(`/v1/worker/orders/${orderId}/accept`, {
      method: "POST",
      headers: { Authorization: worker.auth },
    });

    const rejectRes = await app.request(`/v1/worker/orders/${orderId}/reject`, {
      method: "POST",
      headers: { Authorization: worker.auth, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(rejectRes.status).toBe(409);
  });

  it("GET /v1/worker/orders/history — rejects without token", async () => {
    const res = await app.request("/v1/worker/orders/history");
    expect(res.status).toBe(401);
  });

  it("GET /v1/worker/orders/history — rejects non-worker roles", async () => {
    const customer = await createUserAndHeader("customer");
    const res = await app.request("/v1/worker/orders/history", {
      headers: { Authorization: customer.auth },
    });
    expect(res.status).toBe(403);
  });

  it("GET /v1/worker/orders/history — returns only completed orders for the worker", async () => {
    const customer = await createUserAndHeader("customer");
    const worker = await createUserAndHeader("worker");
    const otherWorker = await createUserAndHeader("worker");

    // One completed order for our worker
    const completedId = await createAndCompleteOrder(customer.auth, worker.auth);

    // One active order that should NOT appear in history
    const activeCreateRes = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });
    const activeOrderId = (await activeCreateRes.json()).data.id as string;
    await app.request(`/v1/worker/orders/${activeOrderId}/accept`, {
      method: "POST",
      headers: { Authorization: worker.auth },
    });

    // A completed order belonging to another worker — must not leak
    await createAndCompleteOrder(customer.auth, otherWorker.auth);

    const res = await app.request("/v1/worker/orders/history", {
      headers: { Authorization: worker.auth },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);

    const ids = json.data.map((o: { id: string }) => o.id);
    expect(ids).toContain(completedId);
    expect(ids).not.toContain(activeOrderId);
    expect(json.data.every((o: { worker_id: string }) => o.worker_id === worker.user.id)).toBe(true);
    expect(json.meta).toBeDefined();
    expect(json.meta.total).toBeGreaterThanOrEqual(1);
  });
});
