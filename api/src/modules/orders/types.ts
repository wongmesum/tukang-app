import type { OrderStatus } from "./state-machine";

export type PricingScheme = "hourly" | "daily";

export interface OrderPricingSnapshot {
  baseRate: number;
  distanceKm: number;
  travelCost: number;
  surchargeHoliday: number;
  surchargeNight: number;
  surchargeWeekend: number;
  surchargeUrgent: number;
  surchargeFloor: number;
  totalEstimate: number;
  totalFinal: number | null;
  actualDuration: number | null;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId: string;
  workerId: string | null;
  serviceId: string;
  status: OrderStatus;
  pricingScheme: PricingScheme;
  estimatedDuration: number;
  description: string | null;
  photos: string[];
  addressId: string;
  customerLocation: { lat: number; lng: number };
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  pricing: OrderPricingSnapshot;
}

export interface CreateOrderInput {
  customerId: string;
  serviceId: string;
  pricingScheme: PricingScheme;
  estimatedDuration: number;
  description: string | null;
  photos: string[];
  addressId: string;
  customerLocation: { lat: number; lng: number };
  scheduledAt: Date | null;
  pricing: OrderPricingSnapshot;
}

export interface OrderRepository {
  create(input: CreateOrderInput): Promise<OrderRecord>;
  findById(id: string): Promise<OrderRecord | null>;
  findByCustomerId(customerId: string): Promise<OrderRecord[]>;
  findIncoming(workerId: string): Promise<OrderRecord[]>;
  findActive(workerId: string): Promise<OrderRecord[]>;
  findHistory(workerId: string): Promise<OrderRecord[]>;
  findAll(filter?: { status?: string }): Promise<OrderRecord[]>;
  update(id: string, patch: Partial<OrderRecord>): Promise<OrderRecord>;
}
