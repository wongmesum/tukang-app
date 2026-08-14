import type { NotificationPayload } from "./types";
import { deviceTokenRepo } from "./repository";
import { sendFcmMessage } from "./firebase";

/**
 * Notification service — sends push notifications via Firebase Cloud Messaging.
 *
 * Features:
 * - Sends to all registered devices of a user
 * - Auto-removes invalid/unregistered tokens
 * - Graceful fallback when Firebase is not configured (logs to console)
 */
export interface NotificationService {
  sendToUser(userId: string, payload: NotificationPayload): Promise<void>;
  sendToMultiple(userIds: string[], payload: NotificationPayload): Promise<void>;
}

class FcmNotificationService implements NotificationService {
  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    const tokens = await deviceTokenRepo.findByUserId(userId);

    if (tokens.length === 0) {
      return;
    }

    const tokensToRemove: string[] = [];

    await Promise.allSettled(
      tokens.map(async (deviceToken) => {
        const result = await sendFcmMessage({
          token: deviceToken.token,
          notification: { title: payload.title, body: payload.body },
          data: payload.data,
          android: {
            priority: "high",
            notification: { channel_id: "tukangndeso_orders", sound: "default" },
          },
        });

        // Clean up invalid tokens
        if (!result.success && result.shouldRemoveToken) {
          tokensToRemove.push(deviceToken.token);
        }
      }),
    );

    // Remove invalid tokens
    for (const token of tokensToRemove) {
      await deviceTokenRepo.unregister(userId, token);
    }
  }

  async sendToMultiple(userIds: string[], payload: NotificationPayload): Promise<void> {
    await Promise.allSettled(userIds.map((id) => this.sendToUser(id, payload)));
  }
}

export const notificationService: NotificationService = new FcmNotificationService();

// --- Convenience helper for order status changes ---

export function getOrderNotification(
  status: string,
  orderNumber: string,
): NotificationPayload | null {
  const mapping: Record<string, { title: string; body: string; type: NotificationPayload["type"] }> = {
    MATCHED: {
      type: "order.new_match",
      title: "Order Baru! 🔔",
      body: `Ada order baru (${orderNumber}) di area Anda. Segera terima!`,
    },
    ACCEPTED: {
      type: "order.accepted",
      title: "Tukang Ditemukan ✅",
      body: `Tukang telah menerima order ${orderNumber}. Sedang menuju lokasi Anda.`,
    },
    EN_ROUTE: {
      type: "order.en_route",
      title: "Tukang Dalam Perjalanan 🚗",
      body: `Tukang sedang menuju lokasi Anda untuk order ${orderNumber}.`,
    },
    ARRIVED: {
      type: "order.arrived",
      title: "Tukang Tiba 📍",
      body: `Tukang telah tiba di lokasi untuk order ${orderNumber}.`,
    },
    IN_PROGRESS: {
      type: "order.started",
      title: "Pekerjaan Dimulai 🔨",
      body: `Pekerjaan untuk order ${orderNumber} telah dimulai.`,
    },
    COMPLETED: {
      type: "order.completed",
      title: "Pekerjaan Selesai ✅",
      body: `Order ${orderNumber} telah selesai. Silakan bayar dan beri rating.`,
    },
    PAID: {
      type: "order.paid",
      title: "Pembayaran Diterima 💰",
      body: `Pembayaran untuk order ${orderNumber} telah masuk ke saldo Anda.`,
    },
    CANCELLED_BY_CUSTOMER: {
      type: "order.cancelled",
      title: "Order Dibatalkan ❌",
      body: `Order ${orderNumber} dibatalkan oleh pelanggan.`,
    },
    CANCELLED_BY_WORKER: {
      type: "order.cancelled",
      title: "Order Dibatalkan ❌",
      body: `Order ${orderNumber} dibatalkan oleh tukang.`,
    },
  };

  const entry = mapping[status];
  if (!entry) return null;

  return {
    type: entry.type,
    title: entry.title,
    body: entry.body,
    data: { order_number: orderNumber, status },
  };
}
