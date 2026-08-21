import { notificationService } from "./service";
import type { OrderStatus } from "../orders/state-machine";

interface OrderNotificationContext {
  orderId: string;
  orderNumber: string;
  customerId: string;
  workerId: string | null;
}

/**
 * Send push notifications on order status transitions.
 * Called alongside WebSocket events for offline delivery.
 */
export function sendOrderNotification(
  newStatus: OrderStatus,
  order: OrderNotificationContext,
): void {
  // Fire-and-forget: don't await so it doesn't block the request
  void _sendOrderNotification(newStatus, order);
}

async function _sendOrderNotification(
  newStatus: OrderStatus,
  order: OrderNotificationContext,
): Promise<void> {
  const { customerId, workerId, orderNumber } = order;

  switch (newStatus) {
    case "MATCHED":
      if (workerId) {
        await notificationService.sendToUser(workerId, {
          title: "Order Baru!",
          body: `Ada order ${orderNumber} untuk Anda. Segera terima sebelum timeout.`,
          data: { order_id: order.orderId, action: "view_incoming" },
        });
      }
      await notificationService.sendToUser(customerId, {
        title: "Tukang Ditemukan",
        body: `Order ${orderNumber}: tukang sedang dikonfirmasi.`,
        data: { order_id: order.orderId, action: "view_order" },
      });
      break;

    case "ACCEPTED":
      await notificationService.sendToUser(customerId, {
        title: "Tukang Menerima Order",
        body: `Order ${orderNumber}: tukang akan segera berangkat ke lokasi Anda.`,
        data: { order_id: order.orderId, action: "view_tracking" },
      });
      break;

    case "EN_ROUTE":
      await notificationService.sendToUser(customerId, {
        title: "Tukang Dalam Perjalanan",
        body: `Order ${orderNumber}: tukang sedang menuju lokasi Anda.`,
        data: { order_id: order.orderId, action: "view_tracking" },
      });
      break;

    case "ARRIVED":
      await notificationService.sendToUser(customerId, {
        title: "Tukang Sudah Tiba",
        body: `Order ${orderNumber}: tukang sudah tiba di lokasi.`,
        data: { order_id: order.orderId, action: "view_order" },
      });
      break;

    case "IN_PROGRESS":
      await notificationService.sendToUser(customerId, {
        title: "Pekerjaan Dimulai",
        body: `Order ${orderNumber}: tukang mulai mengerjakan.`,
        data: { order_id: order.orderId, action: "view_order" },
      });
      break;

    case "COMPLETED":
      await notificationService.sendToUser(customerId, {
        title: "Pekerjaan Selesai",
        body: `Order ${orderNumber}: pekerjaan selesai. Silakan konfirmasi dan bayar.`,
        data: { order_id: order.orderId, action: "view_payment" },
      });
      break;

    case "PAID":
      if (workerId) {
        await notificationService.sendToUser(workerId, {
          title: "Pembayaran Diterima",
          body: `Order ${orderNumber}: pembayaran berhasil. Saldo Anda bertambah.`,
          data: { order_id: order.orderId, action: "view_wallet" },
        });
      }
      break;

    case "CANCELLED_BY_CUSTOMER":
      if (workerId) {
        await notificationService.sendToUser(workerId, {
          title: "Order Dibatalkan",
          body: `Order ${orderNumber}: dibatalkan oleh pelanggan.`,
          data: { order_id: order.orderId, action: "view_order" },
        });
      }
      break;

    case "CANCELLED_BY_WORKER":
      await notificationService.sendToUser(customerId, {
        title: "Order Dibatalkan",
        body: `Order ${orderNumber}: tukang tidak dapat melanjutkan. Kami akan carikan pengganti.`,
        data: { order_id: order.orderId, action: "view_order" },
      });
      break;

    case "EXPIRED":
      await notificationService.sendToUser(customerId, {
        title: "Order Kedaluwarsa",
        body: `Order ${orderNumber}: tidak ada tukang tersedia saat ini. Silakan coba lagi.`,
        data: { order_id: order.orderId, action: "view_order" },
      });
      break;

    default:
      // No notification needed for other statuses
      break;
  }
}
