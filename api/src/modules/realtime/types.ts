// WebSocket event types sent to clients
export type WsEventType =
  | "order.new_match"
  | "order.status_changed"
  | "worker.location_update"
  | "chat.message"
  | "config.categories_updated"
  | "config.services_updated"
  | "config.pricing_updated";

export interface WsEvent {
  type: WsEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface OrderStatusChangedPayload {
  order_id: string;
  order_number: string;
  previous_status: string;
  new_status: string;
  worker_id: string | null;
  customer_id: string;
}

export interface OrderNewMatchPayload {
  order_id: string;
  order_number: string;
  service_id: string;
  category_code: string;
  customer_location: { lat: number; lng: number };
  estimated_duration: number;
  pricing_scheme: string;
  total_estimate: number;
}

export interface WorkerLocationPayload {
  order_id: string;
  worker_id: string;
  location: { lat: number; lng: number };
}

export interface ChatMessagePayload {
  order_id: string;
  message_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  sent_at: string;
}
