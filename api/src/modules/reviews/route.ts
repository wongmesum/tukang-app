import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";
import { orderRepo } from "../orders/repository";
import { transitionOrder } from "../orders/state-machine";
import { reviewRepo } from "./repository";
import { createReviewSchema } from "./schema";
import type { ReviewRecord } from "./types";

function formatReview(review: ReviewRecord) {
  return {
    id: review.id,
    order_id: review.orderId,
    customer_id: review.customerId,
    worker_id: review.workerId,
    rating: review.rating,
    comment: review.comment,
    photos: review.photos,
    created_at: review.createdAt.toISOString(),
  };
}

const reviewsRouter = new Hono();
reviewsRouter.use("/orders/:id/review", authMiddleware);
reviewsRouter.use("/workers/:id/reviews", authMiddleware);

// POST /orders/:id/review
reviewsRouter.post("/orders/:id/review", async (context) => {
  const body = await context.req.json();
  const parsed = createReviewSchema.safeParse(body);

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
  const orderId = context.req.param("id");
  if (!orderId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }
  const order = await orderRepo.findById(orderId);

  if (!order || order.customerId !== authUser.userId) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  if (order.status !== "PAID") {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Review hanya bisa diberikan setelah order dibayar",
        },
      },
      409,
    );
  }

  const existing = await reviewRepo.findByOrderId(orderId);
  if (existing) {
    return context.json(
      {
        success: false,
        error: { code: "CONFLICT", message: "Review sudah ada untuk order ini" },
      },
      409,
    );
  }

  if (!order.workerId) {
    return context.json(
      {
        success: false,
        error: { code: "CONFLICT", message: "Order tidak memiliki tukang yang di-review" },
      },
      409,
    );
  }

  const review = await reviewRepo.create({
    orderId,
    customerId: authUser.userId,
    workerId: order.workerId,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
    photos: parsed.data.photos,
  });

  const nextStatus = transitionOrder(order.status, "REVIEWED");
  await orderRepo.update(orderId, { status: nextStatus });

  return context.json({ success: true, data: formatReview(review) });
});

// GET /orders/:id/review
reviewsRouter.get("/orders/:id/review", async (context) => {
  const authUser = context.get("user");
  const orderId = context.req.param("id");
  if (!orderId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }
  const order = await orderRepo.findById(orderId);

  if (
    !order ||
    (order.customerId !== authUser.userId && order.workerId !== authUser.userId)
  ) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  const review = await reviewRepo.findByOrderId(orderId);
  if (!review) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Review belum ada" } },
      404,
    );
  }

  return context.json({ success: true, data: formatReview(review) });
});

// GET /workers/:id/reviews
reviewsRouter.get("/workers/:id/reviews", async (context) => {
  const workerId = context.req.param("id");
  if (!workerId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID tukang wajib diisi" } },
      400,
    );
  }
  const items = await reviewRepo.findByWorkerId(workerId);
  const avg =
    items.length > 0 ? items.reduce((sum, r) => sum + r.rating, 0) / items.length : 0;

  return context.json({
    success: true,
    data: {
      worker_id: workerId,
      total: items.length,
      rating_average: Math.round(avg * 10) / 10,
      items: items.map(formatReview),
    },
  });
});

export { reviewsRouter };
