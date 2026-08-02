import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";
import { orderRepo } from "../orders/repository";
import { transitionOrder } from "../orders/state-machine";
import { workerRepo } from "../workers/repository";
import { rankCandidates } from "./matcher";
import type { MatchCandidate } from "./matcher";

const matchingRouter = new Hono();
matchingRouter.use("/matching/*", authMiddleware);

// POST /matching/find — find candidates for an order (does not assign)
matchingRouter.post("/matching/find", async (context) => {
  const body = await context.req.json() as { order_id?: string };

  if (!body.order_id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "order_id wajib diisi" } },
      400,
    );
  }

  const order = await orderRepo.findById(body.order_id);
  if (!order) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  // Derive category from service_id (e.g. "seed-AC-cuci-ac-split" → "AC")
  const categoryCode = order.serviceId.split("-")[1] ?? "";

  const allWorkers = await workerRepo.findAll();
  const candidates = rankCandidates({
    categoryCode,
    customerLocation: order.customerLocation,
    workers: allWorkers,
  });

  return context.json({
    success: true,
    data: {
      order_id: order.id,
      category: categoryCode,
      customer_location: order.customerLocation,
      total_candidates: candidates.length,
      candidates: candidates.map((c: MatchCandidate) => ({
        worker_id: c.workerId,
        distance_km: c.distanceKm,
        rating_avg: c.ratingAvg,
        total_orders: c.totalOrders,
      })),
    },
  });
});

// POST /matching/assign — pick best candidate and assign to order
matchingRouter.post("/matching/assign", async (context) => {
  const body = await context.req.json() as { order_id?: string; worker_id?: string };

  if (!body.order_id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "order_id wajib diisi" } },
      400,
    );
  }

  const order = await orderRepo.findById(body.order_id);
  if (!order) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  if (order.status !== "PENDING") {
    return context.json(
      { success: false, error: { code: "CONFLICT", message: "Order sudah di-match atau tidak dalam status PENDING" } },
      409,
    );
  }

  const categoryCode = order.serviceId.split("-")[1] ?? "";
  const allWorkers = await workerRepo.findAll();
  const candidates = rankCandidates({
    categoryCode,
    customerLocation: order.customerLocation,
    workers: allWorkers,
  });

  // If specific worker_id provided, use it; otherwise pick best
  let selectedWorkerId: string | null = null;

  if (body.worker_id) {
    const isEligible = candidates.some((c) => c.workerId === body.worker_id);
    if (!isEligible) {
      return context.json(
        { success: false, error: { code: "CONFLICT", message: "Tukang tidak tersedia atau tidak memenuhi syarat" } },
        409,
      );
    }
    selectedWorkerId = body.worker_id;
  } else {
    if (candidates.length === 0) {
      return context.json(
        { success: false, error: { code: "NO_WORKER_AVAILABLE", message: "Tidak ada tukang tersedia di area ini" } },
        422,
      );
    }
    selectedWorkerId = candidates[0]!.workerId;
  }

  // Transition PENDING → MATCHED
  const nextStatus = transitionOrder(order.status, "MATCHED");
  const updated = await orderRepo.update(order.id, {
    status: nextStatus,
    workerId: selectedWorkerId,
  });

  const chosen = candidates.find((c) => c.workerId === selectedWorkerId);

  return context.json({
    success: true,
    data: {
      order_id: updated.id,
      order_number: updated.orderNumber,
      status: updated.status,
      assigned_worker: {
        worker_id: selectedWorkerId,
        distance_km: chosen?.distanceKm ?? null,
        rating_avg: chosen?.ratingAvg ?? null,
      },
    },
  });
});

export { matchingRouter };
