import { orderRepo } from "./repository";
import type { OrderStatus } from "./state-machine";
import { emitOrderTransition } from "../realtime/order-events";
import { sendOrderNotification } from "../notifications/order-notifications";

// PENDING orders expire after 60 seconds (no tukang found)
const PENDING_TIMEOUT_MS = 60_000;

// MATCHED orders expire after 180 seconds (tukang hasn't accepted)
const MATCHED_TIMEOUT_MS = 180_000;

// Check interval
const CHECK_INTERVAL_MS = 15_000;

let intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Check for expired orders and transition them.
 * Runs periodically via setInterval.
 */
async function checkExpiredOrders(): Promise<void> {
  try {
    const now = Date.now();

    // Check PENDING orders
    const pendingOrders = await orderRepo.findAll({ status: "PENDING" });
    for (const order of pendingOrders) {
      const age = now - order.createdAt.getTime();
      if (age > PENDING_TIMEOUT_MS) {
        await expireOrder(order.id, "PENDING");
      }
    }

    // Check MATCHED orders
    const matchedOrders = await orderRepo.findAll({ status: "MATCHED" });
    for (const order of matchedOrders) {
      const age = now - order.createdAt.getTime();
      if (age > MATCHED_TIMEOUT_MS) {
        await expireOrder(order.id, "MATCHED");
      }
    }
  } catch {
    // Silently ignore errors in background job — will retry next interval
  }
}

async function expireOrder(orderId: string, previousStatus: OrderStatus): Promise<void> {
  const order = await orderRepo.findById(orderId);
  if (!order) return;
  // Double-check status hasn't changed since we queried
  if (order.status !== previousStatus) return;

  const updated = await orderRepo.update(orderId, { status: "EXPIRED" });

  emitOrderTransition(previousStatus, "EXPIRED", {
    id: updated.id,
    orderNumber: updated.orderNumber,
    customerId: updated.customerId,
    workerId: updated.workerId,
    serviceId: updated.serviceId,
    pricingScheme: updated.pricingScheme,
    estimatedDuration: updated.estimatedDuration,
    totalEstimate: updated.pricing.totalEstimate,
    customerLocation: updated.customerLocation,
  });

  sendOrderNotification("EXPIRED", {
    orderId: updated.id,
    orderNumber: updated.orderNumber,
    customerId: updated.customerId,
    workerId: updated.workerId,
  });
}

/**
 * Start the order expiry background job.
 * Call once during server startup (not in test mode).
 */
export function startOrderExpiryJob(): void {
  if (intervalHandle) return; // already running
  intervalHandle = setInterval(checkExpiredOrders, CHECK_INTERVAL_MS);
  // eslint-disable-next-line no-console
  console.log("[OrderExpiry] Background job started (check every 15s)");
}

/**
 * Stop the expiry job (for graceful shutdown).
 */
export function stopOrderExpiryJob(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
