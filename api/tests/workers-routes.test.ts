import { describe, expect, it } from "vitest";
import app from "../src/index";
import { generateTokenPair } from "../src/modules/auth/jwt";
import { userRepo } from "../src/modules/users/repository";

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

async function createAdminAuth() {
  const user = await userRepo.create({
    phone: `08${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100000)}`,
    name: "Test Admin",
    role: "admin",
  });
  const tokens = generateTokenPair({ userId: user.id, role: user.role });
  return { user, auth: `Bearer ${tokens.token}` };
}

function workerRegisterPayload() {
  return {
    ktp_number: "3216012345678901",
    ktp_photo_url: "https://cdn.tukangndeso.id/ktp/sample.jpg",
    bio: "Tukang AC berpengalaman 5 tahun",
    work_radius_km: 15,
    home_location: { lat: -7.4722, lng: 112.4336 },
    skills: ["AC", "LST"],
  };
}

describe("worker routes", () => {
  it("POST /v1/worker/register — rejects without token", async () => {
    const res = await app.request("/v1/worker/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workerRegisterPayload()),
    });
    expect(res.status).toBe(401);
  });

  it("POST /v1/worker/register — creates profile with pending status", async () => {
    const { auth } = await createWorkerAuth();
    const res = await app.request("/v1/worker/register", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(workerRegisterPayload()),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("pending");
    expect(json.data.is_available).toBe(false);
    expect(json.data.skills).toEqual(["AC", "LST"]);
  });

  it("POST /v1/worker/register — rejects duplicate registration", async () => {
    const { auth } = await createWorkerAuth();
    await app.request("/v1/worker/register", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(workerRegisterPayload()),
    });

    const res = await app.request("/v1/worker/register", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(workerRegisterPayload()),
    });
    expect(res.status).toBe(409);
  });

  it("POST /v1/worker/availability — rejects when profile still pending", async () => {
    const { auth } = await createWorkerAuth();
    await app.request("/v1/worker/register", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(workerRegisterPayload()),
    });

    const res = await app.request("/v1/worker/availability", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: true }),
    });
    expect(res.status).toBe(409);
  });

  it("POST /v1/worker/:id/verify — rejects non-admin users", async () => {
    const worker = await createWorkerAuth();
    await app.request("/v1/worker/register", {
      method: "POST",
      headers: { Authorization: worker.auth, "Content-Type": "application/json" },
      body: JSON.stringify(workerRegisterPayload()),
    });

    const res = await app.request(`/v1/worker/${worker.user.id}/verify`, {
      method: "POST",
      headers: { Authorization: worker.auth },
    });

    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("POST /v1/worker/availability — allows toggling after admin verification", async () => {
    const { auth, user } = await createWorkerAuth();
    const admin = await createAdminAuth();
    await app.request("/v1/worker/register", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(workerRegisterPayload()),
    });

    await app.request(`/v1/worker/${user.id}/verify`, {
      method: "POST",
      headers: { Authorization: admin.auth },
    });

    const res = await app.request("/v1/worker/availability", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: true }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.is_available).toBe(true);
    expect(json.data.status).toBe("active");
  });

  it("GET /v1/worker/wallet — starts with zero balance", async () => {
    const { auth } = await createWorkerAuth();
    const res = await app.request("/v1/worker/wallet", {
      headers: { Authorization: auth },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.balance).toBe(0);
    expect(json.data.transactions).toEqual([]);
  });

  it("POST /v1/worker/wallet/withdraw — rejects when balance insufficient", async () => {
    const { auth } = await createWorkerAuth();
    const res = await app.request("/v1/worker/wallet/withdraw", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 50000,
        bank_account: "1234567890",
        bank_name: "BCA",
      }),
    });
    expect(res.status).toBe(409);
  });

  it("wallet auto-credits when order paid", async () => {
    const customer = await createCustomerAuth();
    const worker = await createWorkerAuth();

    // Create order
    const createOrderRes = await app.request("/v1/orders", {
      method: "POST",
      headers: { Authorization: customer.auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: "seed-AC-cuci-ac-split",
        pricing_scheme: "hourly",
        estimated_duration: 2,
        description: "Test",
        photos: [],
        address_id: "addr-wallet",
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
    const order = (await createOrderRes.json()).data;

    // Progress order to COMPLETED
    const steps = ["accept", "enroute", "arrive", "start", "complete"];
    for (const step of steps) {
      await app.request(`/v1/worker/orders/${order.id}/${step}`, {
        method: "POST",
        headers: { Authorization: worker.auth },
      });
    }

    // Generate QRIS and simulate payment
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

    // Check worker wallet
    const walletRes = await app.request("/v1/worker/wallet", {
      headers: { Authorization: worker.auth },
    });
    const wallet = (await walletRes.json()).data;
    expect(wallet.balance).toBe(65000);
    expect(wallet.total_earned).toBe(65000);
    expect(wallet.transactions.length).toBe(1);
    expect(wallet.transactions[0].type).toBe("credit");
  });
});
