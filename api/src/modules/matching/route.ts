import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";
import { orderRepo } from "../orders/repository";
import { assignWorkerToOrder, findCandidatesForOrder } from "./service";
import type { MatchCandidate } from "./matcher";

const matchingRouter = new Hono();
matchingRouter.use("/matching/*", authMiddleware);

// POST /matching/find — rank candidates for an order (does not assign)
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

  const { categoryCode, candidates } = await findCandidatesForOrder(order);

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

// POST /matching/assign — assign a worker (best candidate, or a specific one)
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

  const result = await assignWorkerToOrder({
    order,
    ...(body.worker_id ? { preferredWorkerId: body.worker_id } : {}),
  });

  if (!result.ok) {
    switch (result.reason) {
      case "NOT_PENDING":
        return context.json(
          {
            success: false,
            error: {
              code: "CONFLICT",
              message: "Order sudah di-match atau tidak dalam status PENDING",
            },
          },
          409,
        );
      case "WORKER_NOT_ELIGIBLE":
        return context.json(
          {
            success: false,
            error: {
              code: "CONFLICT",
              message: "Tukang tidak tersedia atau tidak memenuhi syarat",
            },
          },
          409,
        );
      case "NO_WORKER_AVAILABLE":
        return context.json(
          {
            success: false,
            error: {
              code: "NO_WORKER_AVAILABLE",
              message: "Tidak ada tukang tersedia di area ini",
            },
          },
          422,
        );
    }
  }

  return context.json({
    success: true,
    data: {
      order_id: result.order.id,
      order_number: result.order.orderNumber,
      status: result.order.status,
      assigned_worker: {
        worker_id: result.workerId,
        distance_km: result.candidate.distanceKm,
        rating_avg: result.candidate.ratingAvg,
      },
    },
  });
});

export { matchingRouter };
