/**
 * Tests for Tier 3 features:
 *   - Idempotency on order creation
 *   - Cancellation fees
 *   - Customer/worker chat
 *
 * Run: bun test tests/idempotency-cancellation-chat.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";
import app from "../src/index";
import { calculateCancellationFee } from "../src/modules/orders/cancellation";
import type { OrderStatus } from "../src/modules/orders/state-machine";

async function req(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
  extraHeaders: Record<string, string> = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await app.request(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, json: (await response.json()) as any };
}

const TRAVEL_COST = 8000;

function orderPayload(overrides: Record<string, unknown> = {}) {
  return {
    service_id: "seed-AC-cuci-ac-split",
    pricing_scheme: "hourly",
    estimated_duration: 2,
    description: "Order pengujian tier 3",
    photos: [],
    address_id: "test-addr",
    customer_location: { lat: -7.47, lng: 112.43 },
    scheduled_at: null,
    pricing: {
      base_rate: 60000,
      distance_km: 8,
      travel_cost: TRAVEL_COST,
      surcharge: { holiday: 0, night: 0, weekend: 0, urgent: 0, floor: 0 },
      total_estimate: 68000,
    },
    ...overrides,
  };
}

let customerToken: string;
let workers: Array<{ id: string; token: string }>;

beforeAll(async () => {
  const seed = await req("POST", "/dev/seed/demo");
  customerToken = seed.json.data.customers[0].token;
  workers = seed.json.data.workers;
});

function tokenFor(workerId: string): string {
  const worker = workers.find((w) => w.id === workerId);
  if (!worker) throw new Error(`No seeded token for worker ${workerId}`);
  return worker.token;
}

// --- Cancellation fee: pure function ---

describe("calculateCancellationFee", () => {
  it("Charges nothing before the worker departs", () => {
    const freeStatuses: OrderStatus[] = ["PENDING", "MATCHED", "ACCEPTED"];

    for (const status of freeStatuses) {
      const result = calculateCancellationFee({ status, travelCost: TRAVEL_COST });
      expect(result.fee, `${status} should be free`).toBe(0);
      expect(result.workerCompensation).toBe(0);
    }
  });

  it("Charges the travel cost once the worker is en route", () => {
    const result = calculateCancellationFee({
      status: "EN_ROUTE",
      travelCost: TRAVEL_COST,
    });

    expect(result.fee).toBe(TRAVEL_COST);
    // The whole fee compensates the worker; the platform keeps none of it.
    expect(result.workerCompensation).toBe(TRAVEL_COST);
    expect(result.reason).toContain("berangkat");
  });

  it("Handles a zero travel cost without producing a negative fee", () => {
    const result = calculateCancellationFee({ status: "EN_ROUTE", travelCost: 0 });
    expect(result.fee).toBe(0);
  });
});

// --- Idempotency ---

describe("Order creation idempotency", () => {
  it("Replays the original order when the same key is reused", async () => {
    const key = "test-idem-key-duplicate-submit-001";

    const first = await req("POST", "/v1/orders", orderPayload(), customerToken, {
      "Idempotency-Key": key,
    });
    const second = await req("POST", "/v1/orders", orderPayload(), customerToken, {
      "Idempotency-Key": key,
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    // Same order returned — a double tap must not create two jobs.
    expect(second.json.data.id).toBe(first.json.data.id);
    expect(second.json.data.order_number).toBe(first.json.data.order_number);
  });

  it("Creates a separate order for a different key", async () => {
    const first = await req("POST", "/v1/orders", orderPayload(), customerToken, {
      "Idempotency-Key": "test-idem-key-attempt-A",
    });
    const second = await req("POST", "/v1/orders", orderPayload(), customerToken, {
      "Idempotency-Key": "test-idem-key-attempt-B",
    });

    expect(first.json.data.id).not.toBe(second.json.data.id);
  });

  it("Still works without a key (backward compatible)", async () => {
    const res = await req("POST", "/v1/orders", orderPayload(), customerToken);

    expect(res.status).toBe(200);
    expect(res.json.data.id).toBeTruthy();
  });

  it("Does not consume the key when validation fails", async () => {
    const key = "test-idem-key-validation-retry";

    // Missing service_id → rejected before the key is claimed.
    const bad = await req(
      "POST",
      "/v1/orders",
      orderPayload({ service_id: undefined }),
      customerToken,
      { "Idempotency-Key": key },
    );
    expect(bad.status).toBe(400);

    // The same key must still be usable for the corrected payload.
    const good = await req("POST", "/v1/orders", orderPayload(), customerToken, {
      "Idempotency-Key": key,
    });
    expect(good.status).toBe(200);
    expect(good.json.data.id).toBeTruthy();
  });
});

// --- Cancellation endpoint ---

describe("Cancellation endpoint", () => {
  it("Cancelling before departure is free", async () => {
    const created = await req("POST", "/v1/orders", orderPayload(), customerToken);
    const orderId = created.json.data.id;

    const res = await req(
      "POST",
      `/v1/orders/${orderId}/cancel`,
      { reason: "Berubah pikiran" },
      customerToken,
    );

    expect(res.status).toBe(200);
    expect(res.json.data.status).toBe("CANCELLED_BY_CUSTOMER");
    expect(res.json.data.cancellation.fee).toBe(0);
    expect(res.json.data.pricing.cancellation_fee).toBe(0);
  });

  it("Cancelling after departure charges the fee and pays the worker", async () => {
    const created = await req("POST", "/v1/orders", orderPayload(), customerToken);
    const orderId = created.json.data.id;
    const workerId = created.json.data.worker_id;

    // Only meaningful when a worker was actually assigned.
    if (!workerId) return;

    const workerToken = tokenFor(workerId);

    // Balance before, so the assertion isn't affected by earlier tests.
    const before = await req("GET", "/v1/worker/wallet", undefined, workerToken);
    const balanceBefore = before.json.data.balance as number;

    await req("POST", `/v1/worker/orders/${orderId}/accept`, {}, workerToken);
    await req("POST", `/v1/worker/orders/${orderId}/enroute`, {}, workerToken);

    const res = await req(
      "POST",
      `/v1/orders/${orderId}/cancel`,
      { reason: "Ada urusan mendadak" },
      customerToken,
    );

    expect(res.status).toBe(200);
    expect(res.json.data.cancellation.fee).toBe(TRAVEL_COST);
    expect(res.json.data.pricing.cancellation_fee).toBe(TRAVEL_COST);

    const after = await req("GET", "/v1/worker/wallet", undefined, workerToken);
    expect(after.json.data.balance).toBe(balanceBefore + TRAVEL_COST);
  });

  it("Cannot cancel an already cancelled order", async () => {
    const created = await req("POST", "/v1/orders", orderPayload(), customerToken);
    const orderId = created.json.data.id;

    await req("POST", `/v1/orders/${orderId}/cancel`, { reason: "Batal" }, customerToken);
    const second = await req(
      "POST",
      `/v1/orders/${orderId}/cancel`,
      { reason: "Batal lagi" },
      customerToken,
    );

    expect(second.status).toBe(409);
  });
});

// --- Chat ---

describe("Chat", () => {
  /** Creates an order that already has a worker assigned. */
  async function createAssignedOrder() {
    const created = await req("POST", "/v1/orders", orderPayload(), customerToken);
    const workerId = created.json.data.worker_id as string | null;
    return {
      orderId: created.json.data.id as string,
      workerId,
      workerToken: workerId ? tokenFor(workerId) : null,
    };
  }

  it("Customer sends a message and the worker sees it", async () => {
    const { orderId, workerToken } = await createAssignedOrder();
    if (!workerToken) return;

    const sent = await req(
      "POST",
      `/v1/orders/${orderId}/messages`,
      { content: "Pak, rumahnya yang pagar hijau ya" },
      customerToken,
    );

    expect(sent.status).toBe(200);
    expect(sent.json.data.content).toBe("Pak, rumahnya yang pagar hijau ya");
    // The sender's own message is flagged so the client can align it right.
    expect(sent.json.data.is_mine).toBe(true);

    const history = await req(
      "GET",
      `/v1/orders/${orderId}/messages`,
      undefined,
      workerToken,
    );

    expect(history.status).toBe(200);
    expect(history.json.data.length).toBe(1);
    // From the worker's perspective the same message is not theirs.
    expect(history.json.data[0].is_mine).toBe(false);
    expect(history.json.meta.unread).toBe(1);
  });

  it("Both sides can converse and order is preserved", async () => {
    const { orderId, workerToken } = await createAssignedOrder();
    if (!workerToken) return;

    await req("POST", `/v1/orders/${orderId}/messages`, { content: "Pesan 1" }, customerToken);
    await req("POST", `/v1/orders/${orderId}/messages`, { content: "Pesan 2" }, workerToken);
    await req("POST", `/v1/orders/${orderId}/messages`, { content: "Pesan 3" }, customerToken);

    const history = await req("GET", `/v1/orders/${orderId}/messages`, undefined, customerToken);

    expect(history.json.data.map((m: any) => m.content)).toEqual([
      "Pesan 1",
      "Pesan 2",
      "Pesan 3",
    ]);
  });

  it("Marking as read clears the unread count", async () => {
    const { orderId, workerToken } = await createAssignedOrder();
    if (!workerToken) return;

    await req("POST", `/v1/orders/${orderId}/messages`, { content: "Halo" }, customerToken);

    const marked = await req(
      "POST",
      `/v1/orders/${orderId}/messages/read`,
      {},
      workerToken,
    );
    expect(marked.json.data.marked_read).toBe(1);

    const history = await req("GET", `/v1/orders/${orderId}/messages`, undefined, workerToken);
    expect(history.json.meta.unread).toBe(0);
  });

  it("Rejects an empty message", async () => {
    const { orderId, workerToken } = await createAssignedOrder();
    if (!workerToken) return;

    const res = await req(
      "POST",
      `/v1/orders/${orderId}/messages`,
      { content: "   " },
      customerToken,
    );

    expect(res.status).toBe(400);
  });

  it("Blocks someone who isn't part of the order", async () => {
    const { orderId, workerToken } = await createAssignedOrder();
    if (!workerToken) return;

    const seed = await req("POST", "/dev/seed/demo");
    const strangerToken = seed.json.data.customers[2].token;

    const send = await req(
      "POST",
      `/v1/orders/${orderId}/messages`,
      { content: "Saya orang luar" },
      strangerToken,
    );
    expect(send.status).toBe(404);

    const read = await req(
      "GET",
      `/v1/orders/${orderId}/messages`,
      undefined,
      strangerToken,
    );
    expect(read.status).toBe(404);
  });

  it("Closes the chat once the order is cancelled", async () => {
    const { orderId, workerToken } = await createAssignedOrder();
    if (!workerToken) return;

    await req("POST", `/v1/orders/${orderId}/cancel`, { reason: "Batal" }, customerToken);

    const res = await req(
      "POST",
      `/v1/orders/${orderId}/messages`,
      { content: "Masih bisa kirim?" },
      customerToken,
    );

    expect(res.status).toBe(409);

    // History stays readable — the conversation is a record of what happened.
    const history = await req("GET", `/v1/orders/${orderId}/messages`, undefined, customerToken);
    expect(history.status).toBe(200);
    expect(history.json.meta.chat_closed).toBe(true);
  });

  it("Refuses chat before a worker is assigned", async () => {
    // Far from every seeded worker → stays PENDING with no worker.
    const created = await req(
      "POST",
      "/v1/orders",
      orderPayload({
        service_id: "seed-PLB-saluran-mampet",
        customer_location: { lat: -7.36, lng: 112.74 },
      }),
      customerToken,
    );

    if (created.json.data.matching.matched) return;

    const res = await req(
      "POST",
      `/v1/orders/${created.json.data.id}/messages`,
      { content: "Ada tukang?" },
      customerToken,
    );

    expect(res.status).toBe(409);
  });
});
