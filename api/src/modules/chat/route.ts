import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../../shared/auth-middleware";
import { chatRepo } from "./repository";
import { orderRepo } from "../orders/repository";
import { emitChatMessage } from "../realtime/events";

const chatRouter = new Hono();
chatRouter.use("/orders/:id/chat/*", authMiddleware);

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
});

// POST /orders/:id/chat/messages — send a message
chatRouter.post("/orders/:id/chat/messages", async (context) => {
  const authUser = context.get("user");
  const orderId = context.req.param("id");

  if (!orderId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }

  const body = await context.req.json();
  const parsed = sendMessageSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Pesan tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  // Verify user is part of this order
  const order = await orderRepo.findById(orderId);
  if (!order) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  const isCustomer = order.customerId === authUser.userId;
  const isWorker = order.workerId === authUser.userId;

  if (!isCustomer && !isWorker) {
    return context.json(
      { success: false, error: { code: "FORBIDDEN", message: "Anda bukan peserta order ini" } },
      403,
    );
  }

  // Chat only allowed during active statuses
  const chatAllowedStatuses = ["MATCHED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"];
  if (!chatAllowedStatuses.includes(order.status)) {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Chat tidak tersedia pada status order saat ini",
        },
      },
      409,
    );
  }

  const senderRole = isCustomer ? "customer" as const : "worker" as const;

  const message = await chatRepo.create({
    orderId,
    senderId: authUser.userId,
    senderRole,
    content: parsed.data.content,
  });

  // Send real-time event to the other party
  const recipientId = isCustomer ? order.workerId : order.customerId;
  if (recipientId) {
    emitChatMessage(recipientId, {
      order_id: orderId,
      message_id: message.id,
      sender_id: authUser.userId,
      sender_role: senderRole,
      content: message.content,
      sent_at: message.sentAt.toISOString(),
    });
  }

  return context.json({
    success: true,
    data: {
      id: message.id,
      order_id: message.orderId,
      sender_id: message.senderId,
      sender_role: message.senderRole,
      content: message.content,
      sent_at: message.sentAt.toISOString(),
    },
  });
});

// GET /orders/:id/chat/messages — list chat messages for an order
chatRouter.get("/orders/:id/chat/messages", async (context) => {
  const authUser = context.get("user");
  const orderId = context.req.param("id");

  if (!orderId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }

  const order = await orderRepo.findById(orderId);
  if (!order) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  const isCustomer = order.customerId === authUser.userId;
  const isWorker = order.workerId === authUser.userId;

  if (!isCustomer && !isWorker) {
    return context.json(
      { success: false, error: { code: "FORBIDDEN", message: "Anda bukan peserta order ini" } },
      403,
    );
  }

  const messages = await chatRepo.findByOrderId(orderId);

  return context.json({
    success: true,
    data: messages.map((m) => ({
      id: m.id,
      order_id: m.orderId,
      sender_id: m.senderId,
      sender_role: m.senderRole,
      content: m.content,
      sent_at: m.sentAt.toISOString(),
    })),
  });
});

export { chatRouter };
