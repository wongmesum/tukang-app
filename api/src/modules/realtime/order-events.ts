import { emitOrderNewMatch, emitOrderStatusChanged } from "./events";
import type { OrderStatus } from "../orders/state-machine";

interface OrderContext {
  id: string;
  orderNumber: string;
  customerId: string;
  workerId: string | null;
  serviceId: string;
  pricingScheme: string;
  estimatedDuration: number;
  totalEstimate: number;
  customerLocation: { lat: number; lng: number };
}

/**
 * Called after an order status transition to emit real-time events.
 * This is the integration point between order logic and WebSocket notifications.
 */
export function emitOrderTransition(
  previousStatus: OrderStatus,
  newStatus: OrderStatus,
  order: OrderContext,
): void {
  // Always emit status change to both parties
  emitOrderStatusChanged({
    order_id: order.id,
    order_number: order.orderNumber,
    previous_status: previousStatus,
    new_status: newStatus,
    worker_id: order.workerId,
    customer_id: order.customerId,
  });

  // When matched, also send a dedicated new_match event to the worker
  if (newStatus === "MATCHED" && order.workerId) {
    const categoryCode = order.serviceId.includes("-")
      ? order.serviceId.split("-")[1] ?? ""
      : "";

    emitOrderNewMatch(order.workerId, {
      order_id: order.id,
      order_number: order.orderNumber,
      service_id: order.serviceId,
      category_code: categoryCode,
      customer_location: order.customerLocation,
      estimated_duration: order.estimatedDuration,
      pricing_scheme: order.pricingScheme,
      total_estimate: order.totalEstimate,
    });
  }
}
