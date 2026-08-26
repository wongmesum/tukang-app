import { orderRepo } from "./repository";
import type { OrderStatus } from "./state-machine";
import { emitOrderTransition } from "../realtime/order-events";
import { sendOrderNotification } from "../notifications/order-notifications";

// PENDING orders expire after 60 seconds (no tukang found)
const PENDING_TIMEOUT_MS = 60_000;

// MATCHED orders expire after 180 seconds (tukang hasn't accepted)
const MATCHED_TIMEOUT_MS = 180_000;

// Legacy cPanel/Bun check interval. Stateless runtimes should call runOrderExpiryOnce()
// through the protected internal jobs route instead of relying on this interval.
const CHECK_INTERVAL_MS = 15_000;

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let runInFlight: Promise<OrderExpiryResult> | null = null;

export type OrderExpiryResult = {
  checkedPending: number;
  checkedMatched: number;
  expired: number;
};

/**
 * Run a single expiry pass. This is the stateless entrypoint used by an
 * external scheduler. Concurrent calls inside the same process share one run.
 */
export async function runOrderExpiryOnce(): Promise<OrderExpiryResult> {
  if (runInFlight) return runInFlight;

  runInFlight = runOrderExpiryPass();
  try {
    return await runInFlight;
  } finally {
    runInFlight = null;
  }
}

async function runOrderExpiryPass(): Promise<OrderExpiryResult> {
  const now = Date.now();
  let expired = 0;

  const pendingOrders = await orderRepo.findAll({ status: "PENDING" });
  for (const order of pendingOrders) {
    const age = now - order.createdAt.getTime();
    if (age > PENDING_TIMEOUT_MS && (await expireOrder(order.id, "PENDING"))) {
      expired += 1;
    }
  }

  const matchedOrders = await orderRepo.findAll({ status: "MATCHED" });
  for (const order of matchedOrders) {
    const age = now - order.createdAt.getTime();
    if (age > MATCHED_TIMEOUT_MS && (await expireOrder(order.id, "MATCHED"))) {
      expired += 1;
    }
  }

  return {
    checkedPending: pendingOrders.length,
    checkedMatched: matchedOrders.length,
    expired,
  };
}

async function expireOrder(orderId: string, previousStatus: OrderStatus): Promise<boolean> {
  const order = await orderRepo.findById(orderId);
  if (!order) return false;
  // Double-check status hasn't changed since we queried.
  if (order.status !== previousStatus) return false;

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

  return true;
}

/**
 * Start the legacy order expiry background job.
 * Kept for cPanel/local compatibility during migration. Stateless deployments
 * should set BACKGROUND_JOBS_ENABLED=false and invoke the internal job route.
 */
export function startOrderExpiryJob(): void {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    void runOrderExpiryOnce().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("[OrderExpiry] Background pass failed", error);
    });
  }, CHECK_INTERVAL_MS);
  // eslint-disable-next-line no-console
  console.log("[OrderExpiry] Legacy background job started (check every 15s)");
}

/** Stop the legacy expiry interval (for graceful shutdown). */
export function stopOrderExpiryJob(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
