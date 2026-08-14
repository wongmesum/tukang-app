import { Hono } from "hono";
import { adminMiddleware } from "../../shared/admin-middleware";
import { workerRepo } from "../workers/repository";
import { orderRepo } from "../orders/repository";
import { paymentRepo } from "../payments/repository";
import { serviceRepo } from "../services/repository";
import { transitionOrder } from "../orders/state-machine";
import type { OrderStatus } from "../orders/state-machine";
import { randomUUID } from "node:crypto";

import { paginate, parsePagination } from "../../shared/pagination";

const adminRouter = new Hono();
adminRouter.use("*", adminMiddleware);

// --- Worker management ---

// GET /admin/workers/pending
adminRouter.get("/workers/pending", async (context) => {
  const params = parsePagination(context);
  const all = await workerRepo.findAll();
  const pending = all.filter((w) => w.status === "pending");
  const paginated = paginate(pending, params);
  return context.json({
    success: true,
    data: paginated.items.map((w) => ({
      user_id: w.userId,
      ktp_number: w.ktpNumber,
      bio: w.bio,
      skills: w.skills,
      work_radius_km: w.workRadiusKm,
      home_location: w.homeLocation,
      created_at: w.createdAt.toISOString(),
    })),
    meta: paginated.meta,
  });
});

// GET /admin/workers/all
adminRouter.get("/workers/all", async (context) => {
  const params = parsePagination(context);
  const all = await workerRepo.findAll();
  const paginated = paginate(all, params);
  return context.json({
    success: true,
    data: paginated.items.map((w) => ({
      user_id: w.userId,
      status: w.status,
      is_available: w.isAvailable,
      rating_avg: w.ratingAvg,
      total_orders: w.totalOrders,
      skills: w.skills,
      created_at: w.createdAt.toISOString(),
    })),
    meta: paginated.meta,
  });
});

// POST /admin/workers/:id/verify
adminRouter.post("/workers/:id/verify", async (context) => {
  const id = context.req.param("id");
  const profile = await workerRepo.findByUserId(id);
  if (!profile) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Tukang tidak ditemukan" } },
      404,
    );
  }
  if (profile.status === "active") {
    return context.json(
      { success: false, error: { code: "CONFLICT", message: "Tukang sudah aktif" } },
      409,
    );
  }
  const updated = await workerRepo.update(id, { status: "active" });
  return context.json({
    success: true,
    data: {
      user_id: updated.userId,
      status: updated.status,
      message: "Tukang berhasil diverifikasi",
    },
  });
});

// POST /admin/workers/:id/suspend
adminRouter.post("/workers/:id/suspend", async (context) => {
  const id = context.req.param("id");
  const profile = await workerRepo.findByUserId(id);
  if (!profile) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Tukang tidak ditemukan" } },
      404,
    );
  }
  const updated = await workerRepo.update(id, { status: "suspended", isAvailable: false });
  return context.json({
    success: true,
    data: {
      user_id: updated.userId,
      status: updated.status,
      message: "Tukang berhasil di-suspend",
    },
  });
});

// POST /admin/workers/:id/reactivate
adminRouter.post("/workers/:id/reactivate", async (context) => {
  const id = context.req.param("id");
  const profile = await workerRepo.findByUserId(id);
  if (!profile) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Tukang tidak ditemukan" } },
      404,
    );
  }
  if (profile.status !== "suspended") {
    return context.json(
      { success: false, error: { code: "CONFLICT", message: "Tukang tidak dalam status suspended" } },
      409,
    );
  }
  const updated = await workerRepo.update(id, { status: "active" });
  return context.json({
    success: true,
    data: {
      user_id: updated.userId,
      status: updated.status,
      message: "Tukang berhasil diaktifkan kembali",
    },
  });
});

// --- Order & Dispute management ---

// GET /admin/orders?status=DISPUTED
adminRouter.get("/orders", async (context) => {
  const statusFilter = context.req.query("status") as OrderStatus | undefined;
  // Get all orders from all customers (admin has access to all)
  // InMemoryOrderRepository doesn't have findAll, so we use a workaround
  const allWorkers = await workerRepo.findAll();
  const workerIds = allWorkers.map((w) => w.userId);

  // Collect from incoming + active + history for all workers + pending
  const pendingOrders = await orderRepo.findIncoming("");
  const results = [...pendingOrders];

  for (const wId of workerIds) {
    const active = await orderRepo.findActive(wId);
    const history = await orderRepo.findHistory(wId);
    for (const order of [...active, ...history]) {
      if (!results.some((o) => o.id === order.id)) {
        results.push(order);
      }
    }
  }

  const filtered = statusFilter
    ? results.filter((o) => o.status === statusFilter)
    : results;

  return context.json({
    success: true,
    data: filtered.map((o) => ({
      id: o.id,
      order_number: o.orderNumber,
      status: o.status,
      customer_id: o.customerId,
      worker_id: o.workerId,
      service_id: o.serviceId,
      total_estimate: o.pricing.totalEstimate,
      created_at: o.createdAt.toISOString(),
    })),
    meta: { total: filtered.length },
  });
});

// POST /admin/orders/:id/force-transition
adminRouter.post("/orders/:id/force-transition", async (context) => {
  const id = context.req.param("id");
  const body = await context.req.json() as { to_status?: string; note?: string };

  if (!body.to_status) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "to_status wajib diisi" } },
      400,
    );
  }

  const order = await orderRepo.findById(id);
  if (!order) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  try {
    const nextStatus = transitionOrder(order.status, body.to_status as OrderStatus);
    const updated = await orderRepo.update(id, { status: nextStatus });
    return context.json({
      success: true,
      data: {
        id: updated.id,
        order_number: updated.orderNumber,
        previous_status: order.status,
        status: updated.status,
        note: body.note ?? null,
      },
    });
  } catch {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: `Transisi dari ${order.status} ke ${body.to_status} tidak diizinkan`,
        },
      },
      409,
    );
  }
});

// POST /admin/orders/:id/dispute-resolve
adminRouter.post("/orders/:id/dispute-resolve", async (context) => {
  const id = context.req.param("id");
  const body = await context.req.json() as { resolution?: string; refund?: boolean };

  const order = await orderRepo.findById(id);
  if (!order) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  if (order.status !== "DISPUTED") {
    return context.json(
      { success: false, error: { code: "CONFLICT", message: "Order tidak dalam status DISPUTED" } },
      409,
    );
  }

  // If refund requested, mark payments refunded
  if (body.refund) {
    const payments = await paymentRepo.findByOrderId(id);
    for (const p of payments) {
      if (p.status === "paid") {
        await paymentRepo.markRefunded(p.id);
      }
    }
  }

  return context.json({
    success: true,
    data: {
      id: order.id,
      order_number: order.orderNumber,
      resolution: body.resolution ?? "Dispute ditutup oleh admin",
      refunded: body.refund ?? false,
    },
  });
});

// --- Reports ---

// GET /admin/reports/summary
adminRouter.get("/reports/summary", async (context) => {
  const allWorkers = await workerRepo.findAll();
  const pendingWorkers = allWorkers.filter((w) => w.status === "pending").length;
  const activeWorkers = allWorkers.filter((w) => w.status === "active").length;
  const suspendedWorkers = allWorkers.filter((w) => w.status === "suspended").length;
  const avgRating =
    allWorkers.length > 0
      ? Math.round(
          (allWorkers.reduce((sum, w) => sum + w.ratingAvg, 0) / allWorkers.length) * 10,
        ) / 10
      : 0;

  // Collect all orders (same workaround as above)
  const pendingOrders = await orderRepo.findIncoming("");
  const allOrders = [...pendingOrders];
  for (const w of allWorkers) {
    const active = await orderRepo.findActive(w.userId);
    const history = await orderRepo.findHistory(w.userId);
    for (const o of [...active, ...history]) {
      if (!allOrders.some((x) => x.id === o.id)) allOrders.push(o);
    }
  }

  const ordersByStatus: Record<string, number> = {};
  let totalRevenue = 0;
  for (const o of allOrders) {
    ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
    if (o.status === "PAID" || o.status === "REVIEWED") {
      totalRevenue += o.pricing.totalFinal ?? o.pricing.totalEstimate;
    }
  }

  return context.json({
    success: true,
    data: {
      workers: {
        total: allWorkers.length,
        pending: pendingWorkers,
        active: activeWorkers,
        suspended: suspendedWorkers,
        avg_rating: avgRating,
      },
      orders: {
        total: allOrders.length,
        by_status: ordersByStatus,
      },
      revenue: {
        total: totalRevenue,
      },
    },
  });
});

// --- Categories CRUD ---

// GET /admin/categories (all, including inactive)
adminRouter.get("/categories", async (context) => {
  const categories = await serviceRepo.findAllCategories();
  return context.json({
    success: true,
    data: categories.map((c) => ({
      code: c.code,
      name: c.name,
      icon_url: c.iconUrl,
      is_active: c.isActive,
    })),
  });
});

// POST /admin/categories
adminRouter.post("/categories", async (context) => {
  const body = await context.req.json() as {
    code?: string;
    name?: string;
    icon_url?: string;
    is_active?: boolean;
  };

  if (!body.code || !body.name) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "code dan name wajib diisi" } },
      400,
    );
  }

  const code = body.code.toUpperCase().slice(0, 10);

  try {
    const category = await serviceRepo.createCategory({
      code,
      name: body.name,
      iconUrl: body.icon_url ?? null,
      isActive: body.is_active ?? true,
    });

    return context.json({
      success: true,
      data: { code: category.code, name: category.name, icon_url: category.iconUrl, is_active: category.isActive },
    });
  } catch (err) {
    return context.json(
      { success: false, error: { code: "CONFLICT", message: `Kategori ${code} sudah ada` } },
      409,
    );
  }
});

// PATCH /admin/categories/:code
adminRouter.patch("/categories/:code", async (context) => {
  const code = context.req.param("code")?.toUpperCase();
  const body = await context.req.json() as {
    name?: string;
    icon_url?: string;
    is_active?: boolean;
  };

  const updated = await serviceRepo.updateCategory(code, {
    name: body.name,
    iconUrl: body.icon_url,
    isActive: body.is_active,
  });

  if (!updated) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kategori tidak ditemukan" } },
      404,
    );
  }

  return context.json({
    success: true,
    data: { code: updated.code, name: updated.name, icon_url: updated.iconUrl, is_active: updated.isActive },
  });
});

// DELETE /admin/categories/:code
adminRouter.delete("/categories/:code", async (context) => {
  const code = context.req.param("code")?.toUpperCase();
  const deleted = await serviceRepo.deleteCategory(code);

  if (!deleted) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kategori tidak ditemukan" } },
      404,
    );
  }

  return context.json({ success: true, data: { message: `Kategori ${code} berhasil dihapus` } });
});

// --- Services CRUD ---

// GET /admin/services (all services, all categories)
adminRouter.get("/services", async (context) => {
  const services = await serviceRepo.findAllServices();
  return context.json({
    success: true,
    data: services.map((s) => ({
      id: s.id,
      category_code: s.categoryCode,
      name: s.name,
      description: s.description,
      base_hourly_rate: s.baseHourlyRate,
      base_daily_rate: s.baseDailyRate,
      min_hours: s.minHours,
      is_active: s.isActive,
    })),
  });
});

// POST /admin/services
adminRouter.post("/services", async (context) => {
  const body = await context.req.json() as {
    category_code?: string;
    name?: string;
    description?: string;
    base_hourly_rate?: number;
    base_daily_rate?: number;
    min_hours?: number;
    is_active?: boolean;
  };

  if (!body.category_code || !body.name) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "category_code dan name wajib diisi" } },
      400,
    );
  }

  // Verify category exists
  const category = await serviceRepo.findCategoryByCode(body.category_code.toUpperCase());
  if (!category) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kategori tidak ditemukan" } },
      404,
    );
  }

  const service = await serviceRepo.createService({
    id: randomUUID(),
    categoryCode: body.category_code.toUpperCase(),
    name: body.name,
    description: body.description ?? null,
    baseHourlyRate: body.base_hourly_rate ?? 30000,
    baseDailyRate: body.base_daily_rate ?? 150000,
    minHours: body.min_hours ?? 2,
    isActive: body.is_active ?? true,
  });

  return context.json({
    success: true,
    data: {
      id: service.id,
      category_code: service.categoryCode,
      name: service.name,
      description: service.description,
      base_hourly_rate: service.baseHourlyRate,
      base_daily_rate: service.baseDailyRate,
      min_hours: service.minHours,
      is_active: service.isActive,
    },
  });
});

// PATCH /admin/services/:id
adminRouter.patch("/services/:id", async (context) => {
  const id = context.req.param("id");
  const body = await context.req.json() as {
    name?: string;
    description?: string;
    base_hourly_rate?: number;
    base_daily_rate?: number;
    min_hours?: number;
    is_active?: boolean;
  };

  const updated = await serviceRepo.updateService(id, {
    name: body.name,
    description: body.description,
    baseHourlyRate: body.base_hourly_rate,
    baseDailyRate: body.base_daily_rate,
    minHours: body.min_hours,
    isActive: body.is_active,
  });

  if (!updated) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Layanan tidak ditemukan" } },
      404,
    );
  }

  return context.json({
    success: true,
    data: {
      id: updated.id,
      category_code: updated.categoryCode,
      name: updated.name,
      description: updated.description,
      base_hourly_rate: updated.baseHourlyRate,
      base_daily_rate: updated.baseDailyRate,
      min_hours: updated.minHours,
      is_active: updated.isActive,
    },
  });
});

// DELETE /admin/services/:id
adminRouter.delete("/services/:id", async (context) => {
  const id = context.req.param("id");
  const deleted = await serviceRepo.deleteService(id);

  if (!deleted) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Layanan tidak ditemukan" } },
      404,
    );
  }

  return context.json({ success: true, data: { message: "Layanan berhasil dihapus" } });
});

export { adminRouter };
