/**
 * Integration Test: Full Order Lifecycle (E2E)
 *
 * Tests the complete flow:
 * 1. Customer creates order
 * 2. Worker accepts order (PENDING → MATCHED → ACCEPTED)
 * 3. Worker goes en route (ACCEPTED → EN_ROUTE)
 * 4. Worker arrives (EN_ROUTE → ARRIVED)
 * 5. Worker starts work (ARRIVED → IN_PROGRESS)
 * 6. Worker completes (IN_PROGRESS → COMPLETED)
 * 7. Payment (COMPLETED → PAID)
 * 8. Customer reviews (PAID → REVIEWED)
 *
 * Also tests error cases: invalid transitions, unauthorized access.
 *
 * Run: bun test tests/order-lifecycle.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";
import app from "../src/index";

// Test helpers
async function req(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await app.request(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, json: await response.json() as any };
}

let customerToken: string;
let workerToken: string;
let customerId: string;
let workerId: string;
let orderId: string;
let paymentId: string;

describe("Order Lifecycle E2E", () => {
  beforeAll(async () => {
    // Seed demo data to get tokens
    const seedRes = await req("POST", "/dev/seed/demo");
    expect(seedRes.json.success).toBe(true);

    customerToken = seedRes.json.data.customers[0].token;
    customerId = seedRes.json.data.customers[0].id;
    workerToken = seedRes.json.data.workers[0].token;
    workerId = seedRes.json.data.workers[0].id;
  });

  // 1. Customer creates order
  it("POST /v1/orders — customer creates order", async () => {
    const res = await req("POST", "/v1/orders", {
      service_id: "seed-AC-cuci-ac-split",
      pricing_scheme: "hourly",
      estimated_duration: 3,
      description: "AC split di ruang tamu tidak dingin",
      photos: [],
      address_id: "test-address-1",
      customer_location: { lat: -7.47, lng: 112.43 },
      scheduled_at: null,
      pricing: {
        base_rate: 90000,
        distance_km: 8,
        travel_cost: 8000,
        surcharge: { holiday: 0, night: 0, weekend: 0, urgent: 0, floor: 0 },
        total_estimate: 98000,
      },
    }, customerToken);

    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(res.json.data.order_number).toMatch(/^ORD-/);
    expect(res.json.data.pricing.total_estimate).toBe(98000);

    // Auto-matching runs during creation. The seed has AC-skilled workers
    // near the customer, so the order should already be assigned.
    expect(res.json.data.matching.matched).toBe(true);
    expect(res.json.data.status).toBe("MATCHED");
    expect(res.json.data.worker_id).toBe(workerId);

    orderId = res.json.data.id;
  });

  it("Auto-matching picks the nearest eligible worker", async () => {
    // Customer sits closest to worker 1 (Mojosari). Worker 3 handles PLB/LAS
    // only, so an AC order must never land on them.
    const res = await req("POST", "/v1/orders", {
      service_id: "seed-AC-isi-freon-ac",
      pricing_scheme: "hourly",
      estimated_duration: 2,
      description: "Cek matching terdekat",
      photos: [],
      address_id: "test-address-3",
      customer_location: { lat: -7.4722, lng: 112.4336 },
      scheduled_at: null,
      pricing: {
        base_rate: 60000,
        distance_km: 1,
        travel_cost: 5000,
        surcharge: { holiday: 0, night: 0, weekend: 0, urgent: 0, floor: 0 },
        total_estimate: 65000,
      },
    }, customerToken);

    expect(res.json.data.matching.matched).toBe(true);
    expect(res.json.data.matching.distance_km).toBeLessThan(5);
    expect(res.json.data.worker_id).toBe(workerId);
  });

  // 2. Worker accepts order
  it("POST /v1/worker/orders/:id/accept — worker accepts", async () => {
    const res = await req("POST", `/v1/worker/orders/${orderId}/accept`, {}, workerToken);

    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(res.json.data.status).toBe("ACCEPTED");
    expect(res.json.data.worker_id).toBe(workerId);
  });

  // 2b. Another worker cannot accept same order
  it("POST /v1/worker/orders/:id/accept — conflict for second worker", async () => {
    // Use worker 2 token (from seed)
    const seedRes = await req("POST", "/dev/seed/demo");
    const worker2Token = seedRes.json.data.workers[1].token;

    const res = await req("POST", `/v1/worker/orders/${orderId}/accept`, {}, worker2Token);
    expect(res.status).toBe(409);
    expect(res.json.success).toBe(false);
  });

  // 3. Worker en route
  it("POST /v1/worker/orders/:id/enroute — worker departs", async () => {
    const res = await req("POST", `/v1/worker/orders/${orderId}/enroute`, {}, workerToken);

    expect(res.status).toBe(200);
    expect(res.json.data.status).toBe("EN_ROUTE");
  });

  // 3b. Cannot skip to COMPLETED from EN_ROUTE
  it("POST /v1/worker/orders/:id/complete — invalid transition from EN_ROUTE", async () => {
    const res = await req("POST", `/v1/worker/orders/${orderId}/complete`, {}, workerToken);
    expect(res.status).toBe(409);
  });

  // 4. Worker arrives
  it("POST /v1/worker/orders/:id/arrive — worker arrives", async () => {
    const res = await req("POST", `/v1/worker/orders/${orderId}/arrive`, {}, workerToken);

    expect(res.status).toBe(200);
    expect(res.json.data.status).toBe("ARRIVED");
  });

  // 5. Worker starts work
  it("POST /v1/worker/orders/:id/start — work begins", async () => {
    const res = await req("POST", `/v1/worker/orders/${orderId}/start`, {}, workerToken);

    expect(res.status).toBe(200);
    expect(res.json.data.status).toBe("IN_PROGRESS");
    expect(res.json.data.started_at).not.toBeNull();
  });

  // 6. Worker completes
  it("POST /v1/worker/orders/:id/complete — work done", async () => {
    const res = await req("POST", `/v1/worker/orders/${orderId}/complete`, {}, workerToken);

    expect(res.status).toBe(200);
    expect(res.json.data.status).toBe("COMPLETED");
    expect(res.json.data.completed_at).not.toBeNull();
    expect(res.json.data.pricing.total_final).toBe(98000);
  });

  // 7. Customer creates QRIS payment
  it("POST /v1/payments/qris/create — generate QR", async () => {
    const res = await req("POST", "/v1/payments/qris/create", {
      order_id: orderId,
    }, customerToken);

    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(res.json.data.amount).toBe(98000);
    expect(res.json.data.status).toBe("pending");
    expect(res.json.data.qr_string).toBeTruthy();

    paymentId = res.json.data.payment_id;
  });

  // 7b. Simulate payment (dev only)
  it("POST /v1/payments/simulate-paid — simulate payment", async () => {
    const res = await req("POST", "/v1/payments/simulate-paid", {
      payment_id: paymentId,
    }, customerToken);

    expect(res.status).toBe(200);
    expect(res.json.data.status).toBe("paid");
  });

  // 7c. Verify order is now PAID
  it("GET /v1/orders/:id — order is PAID after payment", async () => {
    const res = await req("GET", `/v1/orders/${orderId}`, undefined, customerToken);

    expect(res.status).toBe(200);
    expect(res.json.data.status).toBe("PAID");
  });

  // 8. Customer reviews (via direct API call)
  it("POST /v1/orders/:id/review — customer submits review", async () => {
    const res = await req("POST", `/v1/orders/${orderId}/review`, {
      rating: 5,
      comment: "Tukangnya ramah dan cepat. AC kembali dingin!",
    }, customerToken);

    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(res.json.data.rating).toBe(5);
  });

  // 8b. The review must propagate to the worker's profile rating
  it("Worker rating is recalculated after review", async () => {
    const res = await req("GET", "/v1/worker/profile", undefined, workerToken);

    expect(res.status).toBe(200);
    // Seeded workers start at 0; a 5-star review must lift the average.
    expect(res.json.data.rating_avg).toBeGreaterThan(0);
    expect(res.json.data.rating_avg).toBeLessThanOrEqual(5);
  });

  // 8c. Completing the order must bump the worker's experience counter
  it("Worker total_orders incremented after completion", async () => {
    const res = await req("GET", "/v1/worker/profile", undefined, workerToken);

    expect(res.status).toBe(200);
    expect(res.json.data.total_orders).toBeGreaterThan(0);
  });

  // --- Error cases ---

  it("Customer cannot access worker endpoints", async () => {
    const res = await req("GET", "/v1/worker/orders/incoming", undefined, customerToken);
    expect(res.status).toBe(403);
  });

  it("Unauthenticated request is rejected", async () => {
    const res = await req("GET", "/v1/orders");
    expect(res.status).toBe(401);
  });

  it("Order not found returns 404", async () => {
    const res = await req("GET", "/v1/orders/nonexistent-id", undefined, customerToken);
    expect(res.status).toBe(404);
  });
});

describe("Order Cancellation", () => {
  let cancelOrderId: string;

  it("Customer creates order then cancels", async () => {
    // Create
    const createRes = await req("POST", "/v1/orders", {
      service_id: "seed-AC-pasang-ac-split",
      pricing_scheme: "hourly",
      estimated_duration: 2,
      description: "Test cancel order",
      photos: [],
      address_id: "test-address-2",
      customer_location: { lat: -7.47, lng: 112.43 },
      scheduled_at: null,
      pricing: {
        base_rate: 60000,
        distance_km: 5,
        travel_cost: 5000,
        surcharge: { holiday: 0, night: 0, weekend: 0, urgent: 0, floor: 0 },
        total_estimate: 65000,
      },
    }, customerToken);

    expect(createRes.json.success).toBe(true);
    cancelOrderId = createRes.json.data.id;

    // Cancel
    const cancelRes = await req("POST", `/v1/orders/${cancelOrderId}/cancel`, {
      reason: "Berubah pikiran",
    }, customerToken);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.json.data.status).toBe("CANCELLED_BY_CUSTOMER");
  });

  it("Cannot cancel an already cancelled order", async () => {
    const res = await req("POST", `/v1/orders/${cancelOrderId}/cancel`, {
      reason: "Double cancel",
    }, customerToken);

    expect(res.status).toBe(409);
  });
});

describe("Worker Rejection & Re-matching", () => {
  it("Rejected order is re-offered to a different worker", async () => {
    const seedRes = await req("POST", "/dev/seed/demo");
    const custToken = seedRes.json.data.customers[0].token;

    // Create an order — auto-matching assigns the nearest AC worker
    const createRes = await req("POST", "/v1/orders", {
      service_id: "seed-AC-perbaikan-ac",
      pricing_scheme: "hourly",
      estimated_duration: 2,
      description: "Test reject flow",
      photos: [],
      address_id: "test-address-4",
      customer_location: { lat: -7.47, lng: 112.43 },
      scheduled_at: null,
      pricing: {
        base_rate: 60000,
        distance_km: 5,
        travel_cost: 5000,
        surcharge: { holiday: 0, night: 0, weekend: 0, urgent: 0, floor: 0 },
        total_estimate: 65000,
      },
    }, custToken);

    const rejectOrderId = createRes.json.data.id;
    const assignedWorkerId = createRes.json.data.worker_id;
    expect(assignedWorkerId).toBeTruthy();

    // Find the token belonging to the assigned worker
    const assignedWorker = seedRes.json.data.workers.find(
      (w: { id: string }) => w.id === assignedWorkerId,
    );
    expect(assignedWorker).toBeTruthy();

    // That worker rejects it
    const rejectRes = await req(
      "POST",
      `/v1/worker/orders/${rejectOrderId}/reject`,
      { reason: "Sedang ada pekerjaan lain" },
      assignedWorker.token,
    );

    expect(rejectRes.status).toBe(200);

    // It must not bounce straight back to the same worker
    if (rejectRes.json.data.matching.matched) {
      expect(rejectRes.json.data.worker_id).not.toBe(assignedWorkerId);
    } else {
      // No other AC worker in range — order waits as PENDING
      expect(rejectRes.json.data.status).toBe("PENDING");
      expect(rejectRes.json.data.worker_id).toBeNull();
    }
  });
});

describe("Pricing Calculator Integration", () => {
  it("POST /v1/pricing/estimate — returns correct breakdown", async () => {
    const res = await req("POST", "/v1/pricing/estimate", {
      service_id: "seed-AC-cuci-ac-split",
      pricing_scheme: "hourly",
      duration: 3,
      customer_location: { lat: -7.47, lng: 112.43 },
      floor_level: 1,
      is_urgent: false,
    });

    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(res.json.data.base_rate).toBe(90000); // 3 × 30000
    expect(res.json.data.total_estimate).toBeGreaterThan(0);
  });

  it("POST /v1/pricing/estimate — rejects out of area", async () => {
    const res = await req("POST", "/v1/pricing/estimate", {
      service_id: "seed-AC-cuci-ac-split",
      pricing_scheme: "hourly",
      duration: 2,
      customer_location: { lat: -6.2, lng: 106.8 }, // Jakarta — way too far
      floor_level: 1,
      is_urgent: false,
    });

    expect(res.status).toBe(422);
    expect(res.json.success).toBe(false);
  });
});
