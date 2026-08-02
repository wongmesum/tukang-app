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

function orderPayload() {
  return {
    service_id: "seed-AC-cuci-ac-split",
    pricing_scheme: "hourly",
    estimated_duration: 2,
    description: "Cuci AC review test",
    photos: [],
    address_id: "addr-review",
    customer_location: { lat: -7.4722, lng: 112.4336 },
    scheduled_at: null,
    pricing: {
      base_rate: 60000,
      distance_km: 5,
      travel_cost: 5000,
      surcharge: { holiday: 0, night: 0, weekend: 0, urgent: 0, floor: 0 },
      total_estimate: 65000,
    },
  };
}

async function createOrderAndPayFull() {
  const customer = await createUserAuth("customer");
  const worker = await createUserAuth("worker");

  const createRes = await app.request("/v1/orders", {
    method: "POST",
    headers: { Authorization: customer.auth, "Content-Type": "application/json" },
    body: JSON.stringify(orderPayload()),
  });
  const order = (await createRes.json()).data;

  // Progress to COMPLETED
  const steps = ["accept", "enroute", "arrive", "start", "complete"];
  for (const step of steps) {
    await app.request(`/v1/worker/orders/${order.id}/${step}`, {
      method: "POST",
      headers: { Authorization: worker.auth },
    });
  }

  // Generate QRIS and simulate paid
  const qrisRes = await app.request("/v1/payments/qris/create", {
    method: "POST",
    headers: { Authorization: customer.auth, "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: order.id }),
  });
  const payment = (await qrisRes.json()).data;

  await app.request("/v1/payments/simulate-paid", {
    method: "POST",
    headers: { Authorization: customer.auth, "Content-Type": "application/json" },
    body: JSON.stringify({ payment_id: payment.payment_id }),
  });

  return { customer, worker, order };
}

describe("review routes", () => {
  it("POST /v1/orders/:id/review — rejects without token", async () => {
    const res = await app.request("/v1/orders/fake-id/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5 }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /v1/orders/:id/review — rejects review on non-PAID order", async () => {
    const customer = await createUserAuth("customer");
    const createRes = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload()),
    });
    const order = (await createRes.json()).data;

    const res = await app.request(`/v1/orders/${order.id}/review`, {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5, comment: "Bagus" }),
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
  });

  it("POST /v1/orders/:id/review — creates review and moves order to REVIEWED", async () => {
    const { customer, order } = await createOrderAndPayFull();

    const res = await app.request(`/v1/orders/${order.id}/review`, {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5, comment: "Tukangnya ramah dan cepat", photos: [] }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.rating).toBe(5);
    expect(json.data.comment).toBe("Tukangnya ramah dan cepat");

    // Verify order is REVIEWED
    const orderRes = await app.request(`/v1/orders/${order.id}`, {
      headers: { Authorization: customer.auth },
    });
    const orderJson = await orderRes.json();
    expect(orderJson.data.status).toBe("REVIEWED");
  });

  it("POST /v1/orders/:id/review — rejects duplicate review", async () => {
    const { customer, order } = await createOrderAndPayFull();

    await app.request(`/v1/orders/${order.id}/review`, {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 4, comment: "OK" }),
    });

    const res = await app.request(`/v1/orders/${order.id}/review`, {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 3, comment: "Coba lagi" }),
    });

    expect(res.status).toBe(409);
  });

  it("GET /v1/orders/:id/review — returns review for order", async () => {
    const { customer, order } = await createOrderAndPayFull();

    await app.request(`/v1/orders/${order.id}/review`, {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5, comment: "Mantap" }),
    });

    const res = await app.request(`/v1/orders/${order.id}/review`, {
      headers: { Authorization: customer.auth },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.rating).toBe(5);
  });

  it("GET /v1/workers/:id/reviews — returns worker reviews with average", async () => {
    const { customer, worker, order } = await createOrderAndPayFull();

    await app.request(`/v1/orders/${order.id}/review`, {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 4, comment: "Baik" }),
    });

    const res = await app.request(`/v1/workers/${worker.user.id}/reviews`, {
      headers: { Authorization: customer.auth },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.total).toBeGreaterThanOrEqual(1);
    expect(json.data.rating_average).toBeGreaterThanOrEqual(1);
  });
});
