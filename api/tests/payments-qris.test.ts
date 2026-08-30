import { createHash, createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import app from "../src/index";
import { generateTokenPair } from "../src/modules/auth/jwt";
import { userRepo } from "../src/modules/users/repository";

const WEBHOOK_TEST_SECRET = "test-webhook-secret-qris-vitest";
process.env.QRIS_WEBHOOK_SECRET = WEBHOOK_TEST_SECRET;

function signWebhook(paymentId: string, status: string, reference: string): string {
  const payload = `${paymentId}:${status}:${reference}`;
  return createHmac("sha256", WEBHOOK_TEST_SECRET).update(payload).digest("hex");
}

async function createUserAuth(role: "customer" | "worker") {
  const user = await userRepo.create({
    phone: `08${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100000)}`,
    name: `Test ${role}`,
    role,
  });
  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  return { user, auth: `Bearer ${tokens.token}` };
}

async function createCustomerAndOrder() {
  const { auth } = await createUserAuth("customer");

  const createRes = await app.request("/v1/orders", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: "seed-AC-cuci-ac-split",
      pricing_scheme: "hourly",
      estimated_duration: 2,
      description: "Cuci AC",
      photos: [],
      address_id: "addr-qris",
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

  const order = (await createRes.json()).data;
  return { auth, order };
}

async function progressOrderToCompleted(orderId: string) {
  const worker = await createUserAuth("worker");
  const steps = ["accept", "enroute", "arrive", "start", "complete"];
  for (const step of steps) {
    await app.request(`/v1/worker/orders/${orderId}/${step}`, {
      method: "POST",
      headers: { Authorization: worker.auth },
    });
  }
}

describe("payment QRIS routes", () => {
  it("POST /v1/payments/qris/create — rejects without token", async () => {
    const res = await app.request("/v1/payments/qris/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: "some-order" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /v1/payments/qris/create — generates QRIS for valid order", async () => {
    const { auth, order } = await createCustomerAndOrder();

    const res = await app.request("/v1/payments/qris/create", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.amount).toBe(65000);
    expect(json.data.qr_string).toMatch(/^000201/);
    expect(json.data.qr_image_url).toContain("cdn.tukangndeso.id");
    expect(json.data.status).toBe("pending");
  });

  it("GET /v1/payments/:id/status — checks status", async () => {
    const { auth, order } = await createCustomerAndOrder();
    const createRes = await app.request("/v1/payments/qris/create", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });
    const payment = (await createRes.json()).data;

    const res = await app.request(`/v1/payments/${payment.payment_id}/status`, {
      headers: { Authorization: auth },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("pending");
  });

  it("POST /v1/payments/simulate-paid — updates payment and moves COMPLETED order to PAID", async () => {
    const { auth, order } = await createCustomerAndOrder();
    await progressOrderToCompleted(order.id);

    const createRes = await app.request("/v1/payments/qris/create", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });
    const payment = (await createRes.json()).data;

    const simRes = await app.request("/v1/payments/simulate-paid", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ payment_id: payment.payment_id }),
    });

    expect(simRes.status).toBe(200);
    const simJson = await simRes.json();
    expect(simJson.data.status).toBe("paid");

    const orderRes = await app.request(`/v1/orders/${order.id}`, {
      headers: { Authorization: auth },
    });
    const orderJson = await orderRes.json();
    expect(orderJson.data.status).toBe("PAID");
  });

  it("POST /v1/payments/webhook/qris — rejects missing signature", async () => {
    const { auth, order } = await createCustomerAndOrder();
    const createRes = await app.request("/v1/payments/qris/create", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });
    const payment = (await createRes.json()).data;

    const res = await app.request("/v1/payments/webhook/qris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_id: payment.payment_id,
        status: "paid",
        reference: "MIDTRANS-REF-1001",
      }),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("POST /v1/payments/webhook/qris — rejects invalid signature", async () => {
    const { auth, order } = await createCustomerAndOrder();
    const createRes = await app.request("/v1/payments/qris/create", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });
    const payment = (await createRes.json()).data;

    const res = await app.request("/v1/payments/webhook/qris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_id: payment.payment_id,
        status: "paid",
        reference: "MIDTRANS-REF-1001",
        signature: "invalid-sig",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("POST /v1/payments/webhook/qris — is idempotent for repeated paid calls with valid signature", async () => {
    const { auth, order } = await createCustomerAndOrder();
    const createRes = await app.request("/v1/payments/qris/create", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });
    const payment = (await createRes.json()).data;

    const firstWebhook = await app.request("/v1/payments/webhook/qris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_id: payment.payment_id,
        status: "paid",
        reference: "MIDTRANS-REF-1001",
        signature: signWebhook(payment.payment_id, "paid", "MIDTRANS-REF-1001"),
      }),
    });
    expect(firstWebhook.status).toBe(200);

    // Second call should return success without error (idempotent)
    const secondWebhook = await app.request("/v1/payments/webhook/qris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_id: payment.payment_id,
        status: "paid",
        reference: "MIDTRANS-REF-1001",
        signature: signWebhook(payment.payment_id, "paid", "MIDTRANS-REF-1001"),
      }),
    });
    expect(secondWebhook.status).toBe(200);
  });

  it("POST /v1/payments/webhook/qris — accepts a valid native Midtrans settlement notification", async () => {
    const { auth, order } = await createCustomerAndOrder();
    await progressOrderToCompleted(order.id);

    const createRes = await app.request("/v1/payments/qris/create", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });
    const payment = (await createRes.json()).data;

    const serverKey = "SB-Mid-server-test-native-webhook";
    const statusCode = "200";
    const grossAmount = String(payment.amount);
    const signatureKey = createHash("sha512")
      .update(payment.payment_id + statusCode + grossAmount + serverKey)
      .digest("hex");

    const previousServerKey = process.env.MIDTRANS_SERVER_KEY;
    process.env.MIDTRANS_SERVER_KEY = serverKey;
    try {
      const webhookRes = await app.request("/v1/payments/webhook/qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: payment.payment_id,
          transaction_status: "settlement",
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signatureKey,
          transaction_id: "midtrans-transaction-1001",
        }),
      });

      expect(webhookRes.status).toBe(200);
      const webhookJson = await webhookRes.json();
      expect(webhookJson.data.status).toBe("paid");
      expect(webhookJson.data.reference).toBe("midtrans-transaction-1001");

      const orderRes = await app.request(`/v1/orders/${order.id}`, {
        headers: { Authorization: auth },
      });
      expect((await orderRes.json()).data.status).toBe("PAID");
    } finally {
      if (previousServerKey === undefined) delete process.env.MIDTRANS_SERVER_KEY;
      else process.env.MIDTRANS_SERVER_KEY = previousServerKey;
    }
  });

});
