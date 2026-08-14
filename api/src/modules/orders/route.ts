import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";
import { requireRole } from "../../shared/role-middleware";
import { orderRepo } from "./repository";
import { cancelOrderSchema, createOrderSchema, rejectOrderSchema } from "./schema";
import { transitionOrder } from "./state-machine";
import { notifyOrderTransition } from "./events";
import { tryAutoMatch } from "../matching/service";
import { workerRepo } from "../workers/repository";
import type { OrderRecord } from "./types";

function formatOrder(order: OrderRecord) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    customer_id: order.customerId,
    worker_id: order.workerId,
    service_id: order.serviceId,
    status: order.status,
    pricing_scheme: order.pricingScheme,
    estimated_duration: order.estimatedDuration,
    description: order.description,
    photos: order.photos,
    address_id: order.addressId,
    customer_location: order.customerLocation,
    scheduled_at: order.scheduledAt?.toISOString() ?? null,
    started_at: order.startedAt?.toISOString() ?? null,
    completed_at: order.completedAt?.toISOString() ?? null,
    created_at: order.createdAt.toISOString(),
    pricing: {
      base_rate: order.pricing.baseRate,
      distance_km: order.pricing.distanceKm,
      travel_cost: order.pricing.travelCost,
      surcharge: {
        holiday: order.pricing.surchargeHoliday,
        night: order.pricing.surchargeNight,
        weekend: order.pricing.surchargeWeekend,
        urgent: order.pricing.surchargeUrgent,
        floor: order.pricing.surchargeFloor,
      },
      total_estimate: order.pricing.totalEstimate,
      total_final: order.pricing.totalFinal,
      actual_duration: order.pricing.actualDuration,
    },
  };
}

const ordersRouter = new Hono();
ordersRouter.use("/orders", authMiddleware);
ordersRouter.use("/orders/*", authMiddleware);
ordersRouter.use("/worker/orders", authMiddleware);
ordersRouter.use("/worker/orders/*", authMiddleware);

// POST /orders (customer)
ordersRouter.post("/orders", requireRole("customer"), async (context) => {
  const body = await context.req.json();
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const authUser = context.get("user");
  const data = parsed.data;

  const order = await orderRepo.create({
    customerId: authUser.userId,
    serviceId: data.service_id,
    pricingScheme: data.pricing_scheme,
    estimatedDuration: data.estimated_duration,
    description: data.description ?? null,
    photos: data.photos,
    addressId: data.address_id,
    customerLocation: data.customer_location,
    scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : null,
    pricing: {
      baseRate: data.pricing.base_rate,
      distanceKm: data.pricing.distance_km,
      travelCost: data.pricing.travel_cost,
      surchargeHoliday: data.pricing.surcharge.holiday,
      surchargeNight: data.pricing.surcharge.night,
      surchargeWeekend: data.pricing.surcharge.weekend,
      surchargeUrgent: data.pricing.surcharge.urgent,
      surchargeFloor: data.pricing.surcharge.floor,
      totalEstimate: data.pricing.total_estimate,
      totalFinal: null,
      actualDuration: null,
    },
  });

  // Immediately look for a nearby worker. A booking must still succeed when
  // nobody is available, so the order stays PENDING and the response tells
  // the app whether to show "searching" or "no worker available".
  const matchResult = await tryAutoMatch(order);
  const finalOrder = matchResult.ok ? matchResult.order : order;

  return context.json({
    success: true,
    data: {
      ...formatOrder(finalOrder),
      matching: matchResult.ok
        ? {
            matched: true,
            worker_id: matchResult.workerId,
            distance_km: matchResult.candidate.distanceKm,
          }
        : { matched: false, reason: matchResult.reason },
    },
  });
});

import { paginate, parsePagination } from "../../shared/pagination";

// GET /orders (customer order history)
ordersRouter.get("/orders", async (context) => {
  const authUser = context.get("user");
  const params = parsePagination(context);
  const items = await orderRepo.findByCustomerId(authUser.userId);
  const paginated = paginate(items, params);
  return context.json({ success: true, data: paginated.items.map(formatOrder), meta: paginated.meta });
});

// GET /orders/:id
ordersRouter.get("/orders/:id", async (context) => {
  const authUser = context.get("user");
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }
  const order = await orderRepo.findById(id);

  if (
    !order ||
    (order.customerId !== authUser.userId && order.workerId !== authUser.userId)
  ) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  return context.json({ success: true, data: formatOrder(order) });
});

// POST /orders/:id/cancel (customer cancel)
ordersRouter.post("/orders/:id/cancel", async (context) => {
  const body = await context.req.json();
  const parsed = cancelOrderSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Alasan pembatalan wajib diisi",
        },
      },
      400,
    );
  }

  const authUser = context.get("user");
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }
  const order = await orderRepo.findById(id);

  if (!order || order.customerId !== authUser.userId) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  try {
    const nextStatus = transitionOrder(order.status, "CANCELLED_BY_CUSTOMER");
    const updated = await orderRepo.update(id, { status: nextStatus });
    notifyOrderTransition({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: nextStatus,
      customerId: updated.customerId,
      workerId: updated.workerId,
    });
    return context.json({ success: true, data: formatOrder(updated) });
  } catch {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Order tidak dapat dibatalkan pada status saat ini",
        },
      },
      409,
    );
  }
});

// --- Worker endpoints ---

// GET /worker/orders/incoming
ordersRouter.get("/worker/orders/incoming", requireRole("worker"), async (context) => {
  const authUser = context.get("user");
  const params = parsePagination(context);
  const items = await orderRepo.findIncoming(authUser.userId);
  const paginated = paginate(items, params);
  return context.json({ success: true, data: paginated.items.map(formatOrder), meta: paginated.meta });
});

// GET /worker/orders/active
ordersRouter.get("/worker/orders/active", requireRole("worker"), async (context) => {
  const authUser = context.get("user");
  const params = parsePagination(context);
  const items = await orderRepo.findActive(authUser.userId);
  const paginated = paginate(items, params);
  return context.json({ success: true, data: paginated.items.map(formatOrder), meta: paginated.meta });
});

// GET /worker/orders/history
ordersRouter.get("/worker/orders/history", requireRole("worker"), async (context) => {
  const authUser = context.get("user");
  const params = parsePagination(context);
  const items = await orderRepo.findHistory(authUser.userId);
  const paginated = paginate(items, params);
  return context.json({ success: true, data: paginated.items.map(formatOrder), meta: paginated.meta });
});

// POST /worker/orders/:id/accept
ordersRouter.post("/worker/orders/:id/accept", requireRole("worker"), async (context) => {
  const authUser = context.get("user");
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
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

  if (order.workerId && order.workerId !== authUser.userId) {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Order sudah diambil tukang lain",
        },
      },
      409,
    );
  }

  try {
    // Matching is normally a separate service. In the offline MVP, the first
    // worker accepting a pending order performs the MATCHED transition.
    let currentOrder = order;
    if (currentOrder.status === "PENDING") {
      currentOrder = await orderRepo.update(id, {
        status: transitionOrder(currentOrder.status, "MATCHED"),
        workerId: authUser.userId,
      });
    }

    const nextStatus = transitionOrder(currentOrder.status, "ACCEPTED");
    const updated = await orderRepo.update(id, {
      status: nextStatus,
      workerId: authUser.userId,
    });
    notifyOrderTransition({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: nextStatus,
      customerId: updated.customerId,
      workerId: updated.workerId,
    });
    return context.json({ success: true, data: formatOrder(updated) });
  } catch {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Order sudah diambil atau tidak dapat diterima lagi",
        },
      },
      409,
    );
  }
});

// POST /worker/orders/:id/reject
ordersRouter.post("/worker/orders/:id/reject", requireRole("worker"), async (context) => {
  const authUser = context.get("user");
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }

  const body = await context.req.json().catch(() => ({}));
  const parsed = rejectOrderSchema.safeParse(body);
  if (!parsed.success) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Input tidak valid" } },
      400,
    );
  }

  const order = await orderRepo.findById(id);

  // Only the worker this order is currently assigned to may reject it.
  if (!order || order.workerId !== authUser.userId) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  // Reject only makes sense while the worker hasn't accepted yet (MATCHED).
  // Once ACCEPTED or later, use cancel instead.
  if (order.status !== "MATCHED") {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Order tidak dapat ditolak pada status saat ini",
        },
      },
      409,
    );
  }

  // Re-queue: drop the assignment and send it back to PENDING.
  const requeued = await orderRepo.update(id, {
    status: "PENDING",
    workerId: null,
  });

  // Immediately offer it to the next-best worker, excluding the one who just
  // rejected — otherwise matching would hand it straight back to them.
  const rematch = await tryAutoMatch(requeued, [authUser.userId]);
  const finalOrder = rematch.ok ? rematch.order : requeued;

  return context.json({
    success: true,
    data: {
      ...formatOrder(finalOrder),
      matching: rematch.ok
        ? { matched: true, worker_id: rematch.workerId }
        : { matched: false, reason: rematch.reason },
    },
  });
});

// POST /worker/orders/:id/enroute
ordersRouter.post("/worker/orders/:id/enroute", requireRole("worker"), async (context) => {
  const authUser = context.get("user");
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }
  const order = await orderRepo.findById(id);

  if (!order || order.workerId !== authUser.userId) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  try {
    const nextStatus = transitionOrder(order.status, "EN_ROUTE");
    const updated = await orderRepo.update(id, { status: nextStatus });
    notifyOrderTransition({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: nextStatus,
      customerId: updated.customerId,
      workerId: updated.workerId,
    });
    return context.json({ success: true, data: formatOrder(updated) });
  } catch {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Transisi status ke EN_ROUTE tidak diizinkan",
        },
      },
      409,
    );
  }
});

// POST /worker/orders/:id/arrive
ordersRouter.post("/worker/orders/:id/arrive", requireRole("worker"), async (context) => {
  const authUser = context.get("user");
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }
  const order = await orderRepo.findById(id);

  if (!order || order.workerId !== authUser.userId) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  try {
    const nextStatus = transitionOrder(order.status, "ARRIVED");
    const updated = await orderRepo.update(id, { status: nextStatus });
    notifyOrderTransition({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: nextStatus,
      customerId: updated.customerId,
      workerId: updated.workerId,
    });
    return context.json({ success: true, data: formatOrder(updated) });
  } catch {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Transisi status ke ARRIVED tidak diizinkan",
        },
      },
      409,
    );
  }
});

// POST /worker/orders/:id/start
ordersRouter.post("/worker/orders/:id/start", requireRole("worker"), async (context) => {
  const authUser = context.get("user");
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }
  const order = await orderRepo.findById(id);

  if (!order || order.workerId !== authUser.userId) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  try {
    const nextStatus = transitionOrder(order.status, "IN_PROGRESS");
    const updated = await orderRepo.update(id, {
      status: nextStatus,
      startedAt: new Date(),
    });
    notifyOrderTransition({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: nextStatus,
      customerId: updated.customerId,
      workerId: updated.workerId,
    });
    return context.json({ success: true, data: formatOrder(updated) });
  } catch {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Transisi status ke IN_PROGRESS tidak diizinkan",
        },
      },
      409,
    );
  }
});

// POST /worker/orders/:id/complete
ordersRouter.post("/worker/orders/:id/complete", requireRole("worker"), async (context) => {
  const authUser = context.get("user");
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }
  const order = await orderRepo.findById(id);

  if (!order || order.workerId !== authUser.userId) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  try {
    const nextStatus = transitionOrder(order.status, "COMPLETED");
    const now = new Date();
    const updated = await orderRepo.update(id, {
      status: nextStatus,
      completedAt: now,
      pricing: {
        ...order.pricing,
        totalFinal: order.pricing.totalEstimate,
      },
    });
    notifyOrderTransition({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: nextStatus,
      customerId: updated.customerId,
      workerId: updated.workerId,
    });

    // Credit the completed job to the worker's counter — matching ranks
    // candidates partly by experience, so this must stay current.
    await incrementWorkerOrderCount(authUser.userId);

    return context.json({ success: true, data: formatOrder(updated) });
  } catch {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Transisi status ke COMPLETED tidak diizinkan",
        },
      },
      409,
    );
  }
});

/**
 * Bump a worker's completed-order counter.
 *
 * Best-effort: the order is already COMPLETED, so a counter failure must not
 * turn a successful completion into an error response.
 */
async function incrementWorkerOrderCount(workerId: string): Promise<void> {
  try {
    const profile = await workerRepo.findByUserId(workerId);
    if (!profile) return;
    await workerRepo.update(workerId, { totalOrders: profile.totalOrders + 1 });
  } catch {
    // Ignore — counter drift is acceptable, a failed completion is not.
  }
}

export { ordersRouter };
