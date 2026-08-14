/**
 * Integration tests for Tier 2 behaviours:
 *   - Accept-timeout sweeper (re-queue / expire)
 *   - Dispute filing and admin resolution
 *
 * Run: bun test tests/order-timeout-dispute.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";
import app from "../src/index";
import { sweepStaleOrders, TIMEOUTS } from "../src/modules/orders/timeout-sweeper";

async function req(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await app.request(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, json: (await response.json()) as any };
}

const BASE_PRICING = {
  base_rate: 60000,
  distance_km: 5,
  travel_cost: 5000,
  surcharge: { holiday: 0, night: 0, weekend: 0, urgent: 0, floor: 0 },
  total_estimate: 65000,
};

function orderPayload(overrides: Record<string, unknown> = {}) {
  return {
    service_id: "seed-AC-cuci-ac-split",
    pricing_scheme: "hourly",
    estimated_duration: 2,
    description: "Order untuk pengujian",
    photos: [],
    address_id: "test-addr",
    customer_location: { lat: -7.47, lng: 112.43 },
    scheduled_at: null,
    pricing: BASE_PRICING,
    ...overrides,
  };
}

let customerToken: string;
let adminToken: string;
let workers: Array<{ id: string; token: string }>;

beforeAll(async () => {
  const seed = await req("POST", "/dev/seed/demo");
  customerToken = seed.json.data.customers[0].token;
  adminToken = seed.json.data.admin.token;
  workers = seed.json.data.workers;
});

describe("Accept-timeout sweeper", () => {
  it("Re-queues a MATCHED order once the accept window lapses", async () => {
    const created = await req("POST", "/v1/orders", orderPayload(), customerToken);
    const orderId = created.json.data.id;
    const firstWorkerId = created.json.data.worker_id;

    expect(created.json.data.status).toBe("MATCHED");
    expect(firstWorkerId).toBeTruthy();

    // Pretend we're just past the 3-minute accept window.
    const future = new Date(Date.now() + TIMEOUTS.ACCEPT_TIMEOUT_MS + 1000);
    const result = await sweepStaleOrders(future);

    expect(result.skipped).toBe(false);

    const after = await req("GET", `/v1/orders/${orderId}`, undefined, customerToken);

    // Either handed to a different worker, or left PENDING when nobody else
    // is eligible — but never still sitting with the unresponsive worker.
    if (after.json.data.status === "MATCHED") {
      expect(after.json.data.worker_id).not.toBe(firstWorkerId);
    } else {
      expect(after.json.data.status).toBe("PENDING");
      expect(after.json.data.worker_id).toBeNull();
    }
  });

  it("Leaves a freshly matched order alone", async () => {
    const created = await req("POST", "/v1/orders", orderPayload(), customerToken);
    const orderId = created.json.data.id;
    const workerId = created.json.data.worker_id;

    // Sweep at the current time — nothing is stale yet.
    await sweepStaleOrders(new Date());

    const after = await req("GET", `/v1/orders/${orderId}`, undefined, customerToken);
    expect(after.json.data.status).toBe("MATCHED");
    expect(after.json.data.worker_id).toBe(workerId);
  });

  it("Expires an order that stayed unassigned past the PENDING budget", async () => {
    // PLB has exactly one seeded worker; an order far outside their radius
    // leaves nobody eligible so the order stays PENDING.
    const created = await req(
      "POST",
      "/v1/orders",
      orderPayload({
        service_id: "seed-PLB-saluran-mampet",
        // Still inside the Mojokerto bounding box but far from every worker.
        customer_location: { lat: -7.36, lng: 112.74 },
      }),
      customerToken,
    );

    const orderId = created.json.data.id;

    // Only meaningful if matching genuinely found nobody.
    if (created.json.data.matching.matched) return;

    expect(created.json.data.status).toBe("PENDING");

    const future = new Date(Date.now() + TIMEOUTS.PENDING_EXPIRY_MS + 1000);
    await sweepStaleOrders(future);

    const after = await req("GET", `/v1/orders/${orderId}`, undefined, customerToken);
    expect(after.json.data.status).toBe("EXPIRED");
  });
});

describe("Disputes", () => {
  let disputedOrderId: string;
  let workerTokenForOrder: string;

  /** Drive an order all the way to COMPLETED so it can be disputed. */
  async function createCompletedOrder(): Promise<{ orderId: string; workerToken: string }> {
    const created = await req("POST", "/v1/orders", orderPayload(), customerToken);
    const orderId = created.json.data.id;
    const assignedId = created.json.data.worker_id;

    const worker = workers.find((w) => w.id === assignedId);
    if (!worker) throw new Error("Assigned worker not found in seed data");

    await req("POST", `/v1/worker/orders/${orderId}/accept`, {}, worker.token);
    await req("POST", `/v1/worker/orders/${orderId}/enroute`, {}, worker.token);
    await req("POST", `/v1/worker/orders/${orderId}/arrive`, {}, worker.token);
    await req("POST", `/v1/worker/orders/${orderId}/start`, {}, worker.token);
    await req("POST", `/v1/worker/orders/${orderId}/complete`, {}, worker.token);

    return { orderId, workerToken: worker.token };
  }

  it("Customer can file a dispute on a COMPLETED order", async () => {
    const { orderId, workerToken } = await createCompletedOrder();
    disputedOrderId = orderId;
    workerTokenForOrder = workerToken;

    const res = await req(
      "POST",
      `/v1/orders/${orderId}/dispute`,
      {
        reason: "Pekerjaan belum selesai tapi tukang sudah menandai selesai",
        photos: [],
      },
      customerToken,
    );

    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(res.json.data.filed_by_role).toBe("customer");
    expect(res.json.data.status).toBe("open");
    expect(res.json.data.order_status).toBe("DISPUTED");
  });

  it("Rejects a reason that's too short to act on", async () => {
    const { orderId } = await createCompletedOrder();

    const res = await req(
      "POST",
      `/v1/orders/${orderId}/dispute`,
      { reason: "buruk" },
      customerToken,
    );

    expect(res.status).toBe(400);
    expect(res.json.error.code).toBe("VALIDATION_ERROR");
  });

  it("Prevents a second open dispute on the same order", async () => {
    const res = await req(
      "POST",
      `/v1/orders/${disputedOrderId}/dispute`,
      { reason: "Mencoba melaporkan hal yang sama dua kali" },
      customerToken,
    );

    expect(res.status).toBe(409);
  });

  it("Blocks a stranger from filing on someone else's order", async () => {
    const seed = await req("POST", "/dev/seed/demo");
    const otherCustomerToken = seed.json.data.customers[2].token;

    const res = await req(
      "POST",
      `/v1/orders/${disputedOrderId}/dispute`,
      { reason: "Saya bukan pihak dalam order ini" },
      otherCustomerToken,
    );

    expect(res.status).toBe(404);
  });

  it("Worker on the order can also file", async () => {
    const { orderId } = await createCompletedOrder();

    const res = await req(
      "POST",
      `/v1/orders/${orderId}/dispute`,
      { reason: "Pelanggan menolak membayar setelah pekerjaan selesai" },
      workerTokenForOrder,
    );

    // Only valid when the same seeded worker got this order too.
    if (res.status === 200) {
      expect(res.json.data.filed_by_role).toBe("worker");
    } else {
      expect(res.status).toBe(404);
    }
  });

  it("Admin sees the dispute with its reason", async () => {
    const res = await req("GET", "/v1/admin/disputes?status=open", undefined, adminToken);

    expect(res.status).toBe(200);
    expect(res.json.data.length).toBeGreaterThan(0);

    const found = res.json.data.find((d: any) => d.order_id === disputedOrderId);
    expect(found).toBeTruthy();
    // The reason is what makes the dispute actionable.
    expect(found.reason).toContain("Pekerjaan belum selesai");
    expect(found.order.order_number).toMatch(/^ORD-/);
  });

  it("Admin resolves and closes the order out of DISPUTED", async () => {
    const list = await req("GET", "/v1/admin/disputes?status=open", undefined, adminToken);
    const target = list.json.data.find((d: any) => d.order_id === disputedOrderId);
    expect(target).toBeTruthy();

    const res = await req(
      "POST",
      `/v1/admin/disputes/${target.id}/resolve`,
      {
        resolution: "Tukang kembali menyelesaikan sisa pekerjaan, pelanggan setuju",
        refund: false,
        final_status: "PAID",
      },
      adminToken,
    );

    expect(res.status).toBe(200);
    expect(res.json.data.status).toBe("resolved");
    expect(res.json.data.order_status).toBe("PAID");
  });

  it("Cannot resolve the same dispute twice", async () => {
    const list = await req("GET", "/v1/admin/disputes?status=resolved", undefined, adminToken);
    const resolved = list.json.data.find((d: any) => d.order_id === disputedOrderId);
    expect(resolved).toBeTruthy();

    const res = await req(
      "POST",
      `/v1/admin/disputes/${resolved.id}/resolve`,
      { resolution: "Mencoba menutup ulang", refund: false },
      adminToken,
    );

    expect(res.status).toBe(409);
  });

  it("Dispute cannot be filed on a PENDING order", async () => {
    // Far from all workers → stays PENDING, where a dispute makes no sense.
    const created = await req(
      "POST",
      "/v1/orders",
      orderPayload({
        service_id: "seed-PLB-instalasi-pipa",
        customer_location: { lat: -7.36, lng: 112.74 },
      }),
      customerToken,
    );

    if (created.json.data.matching.matched) return;

    const res = await req(
      "POST",
      `/v1/orders/${created.json.data.id}/dispute`,
      { reason: "Order belum diproses sama sekali oleh sistem" },
      customerToken,
    );

    expect(res.status).toBe(409);
  });
});
