import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";
import { orderRepo } from "../orders/repository";
import { transitionOrder } from "../orders/state-machine";
import { notifyOrderTransition } from "../orders/events";
import { disputeRepo } from "./repository";
import { createDisputeSchema } from "./schema";
import type { DisputeRecord } from "./types";

function formatDispute(dispute: DisputeRecord) {
  return {
    id: dispute.id,
    order_id: dispute.orderId,
    filed_by_id: dispute.filedById,
    filed_by_role: dispute.filedByRole,
    reason: dispute.reason,
    photos: dispute.photos,
    status: dispute.status,
    resolution: dispute.resolution,
    refunded: dispute.refunded,
    resolved_at: dispute.resolvedAt?.toISOString() ?? null,
    created_at: dispute.createdAt.toISOString(),
  };
}

const disputesRouter = new Hono();
disputesRouter.use("/orders/:id/dispute", authMiddleware);
disputesRouter.use("/orders/:id/disputes", authMiddleware);

/**
 * POST /orders/:id/dispute
 *
 * Either party can escalate a problem. Only reachable from statuses where a
 * disagreement is actually possible (work started or money involved) — the
 * state machine enforces this.
 */
disputesRouter.post("/orders/:id/dispute", async (context) => {
  const orderId = context.req.param("id");
  if (!orderId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }

  const body = await context.req.json().catch(() => ({}));
  const parsed = createDisputeSchema.safeParse(body);

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
  const order = await orderRepo.findById(orderId);

  // Only the two parties on the order may file — not arbitrary users.
  const isCustomer = order?.customerId === authUser.userId;
  const isWorker = order?.workerId === authUser.userId;

  if (!order || (!isCustomer && !isWorker)) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  // Refiling while one is already being reviewed would fragment the case.
  const existing = await disputeRepo.findOpenByOrderId(orderId);
  if (existing) {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Sengketa untuk order ini sudah dibuka dan sedang ditinjau admin",
        },
      },
      409,
    );
  }

  // The state machine decides where a dispute is legitimate.
  let nextStatus;
  try {
    nextStatus = transitionOrder(order.status, "DISPUTED");
  } catch {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: `Sengketa tidak dapat dibuka saat order berstatus ${order.status}`,
        },
      },
      409,
    );
  }

  const dispute = await disputeRepo.create({
    orderId,
    filedById: authUser.userId,
    filedByRole: isCustomer ? "customer" : "worker",
    reason: parsed.data.reason,
    photos: parsed.data.photos,
  });

  const updated = await orderRepo.update(orderId, { status: nextStatus });

  // Both parties are told — the one who didn't file needs to know too.
  notifyOrderTransition({
    orderId: updated.id,
    orderNumber: updated.orderNumber,
    status: nextStatus,
    customerId: updated.customerId,
    workerId: updated.workerId,
  });

  return context.json({
    success: true,
    data: {
      ...formatDispute(dispute),
      order_status: updated.status,
    },
  });
});

/**
 * GET /orders/:id/disputes — history for an order (both parties can read).
 */
disputesRouter.get("/orders/:id/disputes", async (context) => {
  const orderId = context.req.param("id");
  if (!orderId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }

  const authUser = context.get("user");
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

  const items = await disputeRepo.findByOrderId(orderId);
  return context.json({
    success: true,
    data: items.map(formatDispute),
  });
});

export { disputesRouter, formatDispute };
