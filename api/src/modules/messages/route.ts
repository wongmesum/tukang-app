import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";
import { orderRepo } from "../orders/repository";
import { userRepo } from "../users/repository";
import { emitChatMessage, isUserConnected } from "../realtime/events";
import { notificationService } from "../notifications/service";
import { messageRepo } from "./repository";
import { sendMessageSchema } from "./schema";
import type { MessageRecord } from "./types";
import type { OrderRecord } from "../orders/types";

/**
 * Chat between the customer and the assigned worker on an order.
 *
 * Scoped to a single order rather than being a general inbox: the whole point
 * is coordinating one job ("saya di depan gerbang", "tolong bawa tangga").
 */

/** Chat closes once the job is finished or called off. */
const CLOSED_STATUSES = [
  "REVIEWED",
  "EXPIRED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_WORKER",
];

function formatMessage(message: MessageRecord, viewerId: string) {
  return {
    id: message.id,
    order_id: message.orderId,
    sender_id: message.senderId,
    content: message.content,
    // Lets the client pick bubble alignment without comparing ids itself.
    is_mine: message.senderId === viewerId,
    read_at: message.readAt?.toISOString() ?? null,
    created_at: message.createdAt.toISOString(),
  };
}

/**
 * Resolve who the other party is. Returns null when the viewer isn't a
 * participant, or when no worker has been assigned yet.
 */
function resolveCounterpart(order: OrderRecord, viewerId: string): string | null {
  if (order.customerId === viewerId) return order.workerId;
  if (order.workerId === viewerId) return order.customerId;
  return null;
}

const messagesRouter = new Hono();
messagesRouter.use("/orders/:id/messages", authMiddleware);
messagesRouter.use("/orders/:id/messages/read", authMiddleware);

// POST /orders/:id/messages — send a message
messagesRouter.post("/orders/:id/messages", async (context) => {
  const orderId = context.req.param("id");
  if (!orderId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }

  const body = await context.req.json().catch(() => ({}));
  const parsed = sendMessageSchema.safeParse(body);

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

  const isParticipant =
    order?.customerId === authUser.userId || order?.workerId === authUser.userId;

  if (!order || !isParticipant) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  if (CLOSED_STATUSES.includes(order.status)) {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Chat sudah ditutup karena order telah selesai atau dibatalkan",
        },
      },
      409,
    );
  }

  const recipientId = resolveCounterpart(order, authUser.userId);
  if (!recipientId) {
    return context.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Belum ada tukang yang ditugaskan, chat belum bisa dimulai",
        },
      },
      409,
    );
  }

  const message = await messageRepo.create({
    orderId,
    senderId: authUser.userId,
    content: parsed.data.content,
  });

  emitChatMessage({
    orderId,
    messageId: message.id,
    senderId: message.senderId,
    recipientId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  });

  // Only push when the recipient has no live connection — otherwise they'd
  // get a banner for a message already on screen.
  if (!isUserConnected(recipientId)) {
    void sendChatPush(recipientId, authUser.userId, orderId, order.orderNumber, message.content);
  }

  return context.json({
    success: true,
    data: formatMessage(message, authUser.userId),
  });
});

// GET /orders/:id/messages — full history for this order
messagesRouter.get("/orders/:id/messages", async (context) => {
  const orderId = context.req.param("id");
  if (!orderId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }

  const authUser = context.get("user");
  const order = await orderRepo.findById(orderId);

  const isParticipant =
    order?.customerId === authUser.userId || order?.workerId === authUser.userId;

  if (!order || !isParticipant) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  const items = await messageRepo.findByOrderId(orderId);
  const unread = await messageRepo.countUnreadForReader(orderId, authUser.userId);

  return context.json({
    success: true,
    data: items.map((m) => formatMessage(m, authUser.userId)),
    meta: {
      total: items.length,
      unread,
      chat_closed: CLOSED_STATUSES.includes(order.status),
    },
  });
});

// POST /orders/:id/messages/read — mark the other party's messages as read
messagesRouter.post("/orders/:id/messages/read", async (context) => {
  const orderId = context.req.param("id");
  if (!orderId) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID order wajib diisi" } },
      400,
    );
  }

  const authUser = context.get("user");
  const order = await orderRepo.findById(orderId);

  const isParticipant =
    order?.customerId === authUser.userId || order?.workerId === authUser.userId;

  if (!order || !isParticipant) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  const marked = await messageRepo.markReadForReader(orderId, authUser.userId);

  return context.json({ success: true, data: { marked_read: marked } });
});

/**
 * Push a chat message to an offline recipient.
 *
 * Best-effort — chat delivery already succeeded via the database.
 */
async function sendChatPush(
  recipientId: string,
  senderId: string,
  orderId: string,
  orderNumber: string,
  content: string,
): Promise<void> {
  try {
    const sender = await userRepo.findById(senderId);
    const senderName = sender?.name ?? "Pesan baru";

    // Keep the preview short — notification trays truncate anyway.
    const preview = content.length > 80 ? `${content.slice(0, 77)}...` : content;

    await notificationService.sendToUser(recipientId, {
      type: "chat.message",
      title: senderName,
      body: preview,
      data: { order_id: orderId, order_number: orderNumber, type: "chat" },
    });
  } catch {
    // Ignore — the message is stored and will appear when they open the app.
  }
}

export { messagesRouter };
