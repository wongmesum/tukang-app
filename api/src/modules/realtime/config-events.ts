import { hub } from "./hub";
import type { WsEvent } from "./types";

/**
 * Broadcast master data change events to all connected clients.
 * Clients receive these and can refresh their local data.
 */

export function broadcastCategoriesUpdated(action: "created" | "updated" | "toggled", categoryCode: string): void {
  const event: WsEvent = {
    type: "config.categories_updated",
    data: { action, category_code: categoryCode },
    timestamp: new Date().toISOString(),
  };
  hub.broadcast(event);
}

export function broadcastServicesUpdated(action: "created" | "updated" | "toggled", serviceId: string, categoryCode: string): void {
  const event: WsEvent = {
    type: "config.services_updated",
    data: { action, service_id: serviceId, category_code: categoryCode },
    timestamp: new Date().toISOString(),
  };
  hub.broadcast(event);
}

export function broadcastPricingUpdated(): void {
  const event: WsEvent = {
    type: "config.pricing_updated",
    data: { message: "Pricing config updated" },
    timestamp: new Date().toISOString(),
  };
  hub.broadcast(event);
}
