import { Hono } from "hono";
import { env } from "../../config/env";
import { generateTokenPair } from "../auth/jwt";
import { userRepo } from "../users/repository";
import { walletRepo, workerRepo } from "../workers/repository";
import { orderRepo } from "../orders/repository";
import { serviceRepo } from "../services/repository";
import { calculatePricing } from "../pricing/calculator";

const MOJOKERTO_LOCATIONS = [
  { lat: -7.4722, lng: 112.4336, district: "Mojosari" },
  { lat: -7.4580, lng: 112.4200, district: "Sooko" },
  { lat: -7.4900, lng: 112.4100, district: "Puri" },
  { lat: -7.5100, lng: 112.3900, district: "Trowulan" },
  { lat: -7.4650, lng: 112.4500, district: "Bangsal" },
];

const WORKER_NAMES = [
  "Budi Santoso",
  "Agus Setiawan",
  "Dwi Prasetyo",
  "Eko Widodo",
  "Faisal Rahman",
];

const WORKER_SKILLS: string[][] = [
  ["AC", "LST"],
  ["BGN", "CAT"],
  ["PLB", "LAS"],
  ["AC", "BGN", "LST"],
  ["TKY", "CLN", "TNM"],
];

const CUSTOMER_NAMES = [
  "Rina Wulandari",
  "Siti Aminah",
  "Hendra Gunawan",
];

const seedRouter = new Hono();

// POST /dev/seed/demo — basic seed (users + workers)
seedRouter.post("/demo", async (context) => {
  if (env.NODE_ENV === "production") {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      404,
    );
  }

  const customers: Array<{ phone: string; name: string; token: string; id: string }> = [];
  for (let i = 1; i <= 3; i += 1) {
    const phone = `0812300000${String(i).padStart(2, "0")}`;
    let user = await userRepo.findByPhone(phone);
    user ??= await userRepo.create({
      phone,
      name: CUSTOMER_NAMES[i - 1] ?? `Pelanggan ${i}`,
      role: "customer",
    });
    const tokens = generateTokenPair({ userId: user.id, role: user.role });
    customers.push({ phone: user.phone, name: user.name, token: tokens.token, id: user.id });
  }

  const workers: Array<{
    phone: string;
    name: string;
    skills: string[];
    token: string;
    id: string;
    location: { lat: number; lng: number };
  }> = [];
  for (let i = 1; i <= 5; i += 1) {
    const phone = `0856700000${String(i).padStart(2, "0")}`;
    let user = await userRepo.findByPhone(phone);
    user ??= await userRepo.create({
      phone,
      name: WORKER_NAMES[i - 1] ?? `Tukang ${i}`,
      role: "worker",
    });
    const tokens = generateTokenPair({ userId: user.id, role: user.role });

    const existing = await workerRepo.findByUserId(user.id);
    if (!existing) {
      const loc = MOJOKERTO_LOCATIONS[i - 1] ?? MOJOKERTO_LOCATIONS[0]!;
      const skills = WORKER_SKILLS[i - 1] ?? ["AC"];
      await workerRepo.create({
        userId: user.id,
        ktpNumber: `320${i}012345678901`,
        ktpPhotoUrl: `https://cdn.tukangndeso.id/ktp/demo-${i}.jpg`,
        bio: `Tukang berpengalaman di ${loc.district}`,
        workRadiusKm: 20,
        homeLocation: { lat: loc.lat, lng: loc.lng },
        skills,
      });
      await workerRepo.update(user.id, { status: "active", isAvailable: true });
    }
    await walletRepo.ensureFor(user.id);
    workers.push({
      phone: user.phone,
      name: user.name,
      skills: WORKER_SKILLS[i - 1] ?? ["AC"],
      token: tokens.token,
      id: user.id,
      location: MOJOKERTO_LOCATIONS[i - 1] ?? MOJOKERTO_LOCATIONS[0]!,
    });
  }

  const adminPhone = "081200000099";
  let admin = await userRepo.findByPhone(adminPhone);
  admin ??= await userRepo.create({
    phone: adminPhone,
    name: "Admin Dev",
    role: "admin",
  });
  const adminTokens = generateTokenPair({ userId: admin.id, role: admin.role });

  return context.json({
    success: true,
    data: {
      customers,
      workers,
      admin: {
        phone: admin.phone,
        name: admin.name,
        token: adminTokens.token,
        id: admin.id,
      },
      note: "Data seed untuk development. Gunakan token untuk test API.",
    },
  });
});

// POST /dev/seed/full — full seed with sample orders in various states
seedRouter.post("/full", async (context) => {
  if (env.NODE_ENV === "production") {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      404,
    );
  }

  // First run demo seed to get users
  const customers: Array<{ id: string; phone: string; name: string; token: string }> = [];
  for (let i = 1; i <= 3; i += 1) {
    const phone = `0812300000${String(i).padStart(2, "0")}`;
    let user = await userRepo.findByPhone(phone);
    user ??= await userRepo.create({
      phone,
      name: CUSTOMER_NAMES[i - 1] ?? `Pelanggan ${i}`,
      role: "customer",
    });
    const tokens = generateTokenPair({ userId: user.id, role: user.role });
    customers.push({ id: user.id, phone: user.phone, name: user.name, token: tokens.token });
  }

  const workers: Array<{ id: string; phone: string; name: string; token: string; skills: string[] }> = [];
  for (let i = 1; i <= 5; i += 1) {
    const phone = `0856700000${String(i).padStart(2, "0")}`;
    let user = await userRepo.findByPhone(phone);
    user ??= await userRepo.create({
      phone,
      name: WORKER_NAMES[i - 1] ?? `Tukang ${i}`,
      role: "worker",
    });
    const tokens = generateTokenPair({ userId: user.id, role: user.role });

    const existing = await workerRepo.findByUserId(user.id);
    if (!existing) {
      const loc = MOJOKERTO_LOCATIONS[i - 1] ?? MOJOKERTO_LOCATIONS[0]!;
      const skills = WORKER_SKILLS[i - 1] ?? ["AC"];
      await workerRepo.create({
        userId: user.id,
        ktpNumber: `320${i}012345678901`,
        ktpPhotoUrl: `https://cdn.tukangndeso.id/ktp/demo-${i}.jpg`,
        bio: `Tukang berpengalaman di ${loc.district}`,
        workRadiusKm: 20,
        homeLocation: { lat: loc.lat, lng: loc.lng },
        skills,
      });
      await workerRepo.update(user.id, { status: "active", isAvailable: true });
    }
    await walletRepo.ensureFor(user.id);
    workers.push({
      id: user.id,
      phone: user.phone,
      name: user.name,
      token: tokens.token,
      skills: WORKER_SKILLS[i - 1] ?? ["AC"],
    });
  }

  const adminPhone = "081200000099";
  let admin = await userRepo.findByPhone(adminPhone);
  admin ??= await userRepo.create({ phone: adminPhone, name: "Admin Dev", role: "admin" });
  const adminTokens = generateTokenPair({ userId: admin.id, role: admin.role });

  // Get first available service
  const categories = await serviceRepo.findCategories();
  const acServices = await serviceRepo.findServicesByCategory("AC");
  const bgnServices = await serviceRepo.findServicesByCategory("BGN");
  const firstService = acServices[0] ?? bgnServices[0];

  // Create sample orders in various states
  const sampleOrders: Array<{ id: string; order_number: string; status: string; description: string }> = [];

  if (firstService) {
    const orderScenarios = [
      { status: "PENDING", desc: "AC bocor di kamar tidur", customerId: customers[0]!.id },
      { status: "ACCEPTED", desc: "Pasang AC split baru 1 PK", customerId: customers[0]!.id, workerId: workers[0]!.id },
      { status: "IN_PROGRESS", desc: "Cuci 3 unit AC kantor", customerId: customers[1]!.id, workerId: workers[0]!.id },
      { status: "COMPLETED", desc: "Perbaikan AC tidak dingin", customerId: customers[1]!.id, workerId: workers[3]!.id },
      { status: "PAID", desc: "Isi freon AC split", customerId: customers[2]!.id, workerId: workers[0]!.id },
      { status: "CANCELLED_BY_CUSTOMER", desc: "Bongkar AC pindah rumah (batal)", customerId: customers[2]!.id },
    ];

    for (const scenario of orderScenarios) {
      const pricing = calculatePricing({
        pricingScheme: "hourly",
        duration: 3,
        distanceKm: 8,
        floorLevel: 1,
        isUrgent: false,
        scheduledAt: new Date(),
        isNationalHoliday: false,
      });

      const order = await orderRepo.create({
        customerId: scenario.customerId,
        serviceId: firstService.id,
        pricingScheme: "hourly",
        estimatedDuration: 3,
        description: scenario.desc,
        photos: [],
        addressId: "seed-address-1",
        customerLocation: { lat: -7.4700, lng: 112.4300 },
        scheduledAt: null,
        pricing: {
          baseRate: pricing.baseRate,
          distanceKm: 8,
          travelCost: pricing.travelCost,
          surchargeHoliday: pricing.surcharges.holiday,
          surchargeNight: pricing.surcharges.night,
          surchargeWeekend: pricing.surcharges.weekend,
          surchargeUrgent: pricing.surcharges.urgent,
          surchargeFloor: pricing.surcharges.floor,
          totalEstimate: pricing.totalEstimate,
          totalFinal: scenario.status === "PAID" ? pricing.totalEstimate : null,
          actualDuration: null,
          cancellationFee: null,
        },
      });

      // Progress order to target status
      if (scenario.workerId && scenario.status !== "PENDING") {
        await orderRepo.update(order.id, { status: "MATCHED", workerId: scenario.workerId });
        if (["ACCEPTED", "IN_PROGRESS", "COMPLETED", "PAID"].includes(scenario.status)) {
          await orderRepo.update(order.id, { status: "ACCEPTED" });
        }
        if (["IN_PROGRESS", "COMPLETED", "PAID"].includes(scenario.status)) {
          await orderRepo.update(order.id, { status: "EN_ROUTE" });
          await orderRepo.update(order.id, { status: "ARRIVED" });
          await orderRepo.update(order.id, { status: "IN_PROGRESS", startedAt: new Date() });
        }
        if (["COMPLETED", "PAID"].includes(scenario.status)) {
          await orderRepo.update(order.id, {
            status: "COMPLETED",
            completedAt: new Date(),
            pricing: { ...order.pricing, totalFinal: pricing.totalEstimate },
          });
        }
        if (scenario.status === "PAID") {
          await orderRepo.update(order.id, { status: "PAID" });
          // Credit worker wallet
          await walletRepo.addTransaction(
            scenario.workerId,
            "credit",
            pricing.totalEstimate,
            `Pendapatan order ${order.orderNumber}`,
            order.id,
          );
        }
      }
      if (scenario.status === "CANCELLED_BY_CUSTOMER") {
        await orderRepo.update(order.id, { status: "CANCELLED_BY_CUSTOMER" });
      }

      const final = await orderRepo.findById(order.id);
      sampleOrders.push({
        id: final!.id,
        order_number: final!.orderNumber,
        status: final!.status,
        description: scenario.desc,
      });
    }
  }

  return context.json({
    success: true,
    data: {
      summary: {
        customers: customers.length,
        workers: workers.length,
        orders: sampleOrders.length,
        categories: categories.length,
      },
      customers: customers.map((c) => ({ id: c.id, phone: c.phone, name: c.name, token: c.token })),
      workers: workers.map((w) => ({ id: w.id, phone: w.phone, name: w.name, token: w.token, skills: w.skills })),
      admin: { id: admin.id, phone: admin.phone, name: admin.name, token: adminTokens.token },
      orders: sampleOrders,
      note: "Full seed complete. Gunakan token untuk test semua fitur.",
      usage: {
        "test booking": `curl -X POST localhost:3000/v1/orders -H "Authorization: Bearer ${customers[0]!.token}" -H "Content-Type: application/json" -d '...'`,
        "worker accept": `curl -X POST localhost:3000/v1/worker/orders/{id}/accept -H "Authorization: Bearer ${workers[0]!.token}"`,
        "admin dashboard": `Token admin: ${adminTokens.token}`,
      },
    },
  });
});

export { seedRouter };
