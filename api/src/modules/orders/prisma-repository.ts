import { randomUUID } from "crypto";
import { prisma } from "../../shared/prisma";
import type { CreateOrderInput, OrderRecord, OrderRepository, OrderPricingSnapshot } from "./types";
import type { OrderStatus } from "./state-machine";
import type { Order, OrderPricing } from "@prisma/client";

interface OrderLocationRow {
  lat: number;
  lng: number;
}

type OrderWithPricing = Order & { pricing: OrderPricing | null };

function mapPricing(p: OrderPricing | null): OrderPricingSnapshot {
  if (!p) {
    return {
      baseRate: 0, distanceKm: 0, travelCost: 0,
      surchargeHoliday: 0, surchargeNight: 0, surchargeWeekend: 0,
      surchargeUrgent: 0, surchargeFloor: 0,
      totalEstimate: 0, totalFinal: null, actualDuration: null,
      cancellationFee: null,
    };
  }
  return {
    baseRate: p.baseRate,
    distanceKm: Number(p.distanceKm),
    travelCost: p.travelCost,
    surchargeHoliday: p.surchargeHoliday,
    surchargeNight: p.surchargeNight,
    surchargeWeekend: p.surchargeWeekend,
    surchargeUrgent: p.surchargeUrgent,
    surchargeFloor: p.surchargeFloor,
    totalEstimate: p.totalEstimate,
    totalFinal: p.totalFinal,
    actualDuration: p.actualDuration ? Number(p.actualDuration) : null,
    cancellationFee: p.cancellationFee,
  };
}

function mapToRecord(o: OrderWithPricing, location: { lat: number; lng: number }): OrderRecord {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.customerId,
    workerId: o.workerId,
    serviceId: o.serviceId,
    status: o.status as OrderStatus,
    pricingScheme: o.pricingScheme as OrderRecord["pricingScheme"],
    estimatedDuration: o.estimatedDuration,
    description: o.description,
    photos: o.photos,
    addressId: o.addressId,
    customerLocation: location,
    scheduledAt: o.scheduledAt,
    matchedAt: o.matchedAt,
    startedAt: o.startedAt,
    completedAt: o.completedAt,
    createdAt: o.createdAt,
    pricing: mapPricing(o.pricing),
  };
}

function createOrderNumber(now: Date): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `ORD-${date}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

async function fetchLocation(orderId: string): Promise<{ lat: number; lng: number }> {
  const rows = await prisma.$queryRaw<OrderLocationRow[]>`
    SELECT ST_Y(customer_location::geometry) as lat, ST_X(customer_location::geometry) as lng
    FROM orders WHERE id = ${orderId}
  `;
  return rows[0] ?? { lat: 0, lng: 0 };
}

export class PrismaOrderRepository implements OrderRepository {
  async create(input: CreateOrderInput): Promise<OrderRecord> {
    const orderNumber = createOrderNumber(new Date());

    // Insert order with raw SQL for the geography column
    const orderId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO orders (
        id, order_number, customer_id, service_id, status, pricing_scheme,
        estimated_duration, description, photos, address_id, customer_location,
        scheduled_at, created_at
      ) VALUES (
        ${orderId}, ${orderNumber}, ${input.customerId}, ${input.serviceId},
        'PENDING', ${input.pricingScheme}::"PricingScheme",
        ${input.estimatedDuration}, ${input.description}, ${input.photos},
        ${input.addressId},
        ST_SetSRID(ST_MakePoint(${input.customerLocation.lng}, ${input.customerLocation.lat}), 4326)::geography,
        ${input.scheduledAt}, CURRENT_TIMESTAMP
      )
    `;

    // Insert pricing using Prisma (no geography involved)
    await prisma.orderPricing.create({
      data: {
        orderId,
        baseRate: input.pricing.baseRate,
        distanceKm: input.pricing.distanceKm,
        travelCost: input.pricing.travelCost,
        surchargeHoliday: input.pricing.surchargeHoliday,
        surchargeNight: input.pricing.surchargeNight,
        surchargeWeekend: input.pricing.surchargeWeekend,
        surchargeUrgent: input.pricing.surchargeUrgent,
        surchargeFloor: input.pricing.surchargeFloor,
        totalEstimate: input.pricing.totalEstimate,
      },
    });

    const result = await this.findById(orderId);
    if (!result) throw new Error("Order not found after create");
    return result;
  }

  async findById(id: string): Promise<OrderRecord | null> {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { pricing: true },
    });
    if (!order) return null;

    const location = await fetchLocation(id);
    return mapToRecord(order, location);
  }

  async findByCustomerId(customerId: string): Promise<OrderRecord[]> {
    const orders = await prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: { pricing: true },
    });
    // Batch locations
    return this.attachLocations(orders);
  }

  async findIncoming(workerId: string): Promise<OrderRecord[]> {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { status: "PENDING" },
          { status: "MATCHED", workerId },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { pricing: true },
    });
    return this.attachLocations(orders);
  }

  async findActive(workerId: string): Promise<OrderRecord[]> {
    const activeStatuses = ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"];
    const orders = await prisma.order.findMany({
      where: { workerId, status: { in: activeStatuses } },
      orderBy: { createdAt: "desc" },
      include: { pricing: true },
    });
    return this.attachLocations(orders);
  }

  async findHistory(workerId: string): Promise<OrderRecord[]> {
    const historyStatuses = [
      "COMPLETED", "PAID", "REVIEWED",
      "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_WORKER", "DISPUTED", "EXPIRED",
    ];
    const orders = await prisma.order.findMany({
      where: { workerId, status: { in: historyStatuses } },
      orderBy: { createdAt: "desc" },
      include: { pricing: true },
    });
    return this.attachLocations(orders);
  }

  async update(id: string, patch: Partial<OrderRecord>): Promise<OrderRecord> {
    // Update order fields
    const orderData: Record<string, unknown> = {};
    if (patch.status !== undefined) orderData.status = patch.status;
    if (patch.workerId !== undefined) orderData.workerId = patch.workerId;
    if (patch.matchedAt !== undefined) orderData.matchedAt = patch.matchedAt;
    if (patch.startedAt !== undefined) orderData.startedAt = patch.startedAt;
    if (patch.completedAt !== undefined) orderData.completedAt = patch.completedAt;

    if (Object.keys(orderData).length > 0) {
      await prisma.order.update({ where: { id }, data: orderData });
    }

    // Update pricing if provided
    if (patch.pricing) {
      const pricingData: Record<string, unknown> = {};
      if (patch.pricing.totalFinal !== undefined) pricingData.totalFinal = patch.pricing.totalFinal;
      if (patch.pricing.actualDuration !== undefined) pricingData.actualDuration = patch.pricing.actualDuration;
      if (patch.pricing.cancellationFee !== undefined) {
        pricingData.cancellationFee = patch.pricing.cancellationFee;
      }

      if (Object.keys(pricingData).length > 0) {
        await prisma.orderPricing.update({ where: { orderId: id }, data: pricingData });
      }
    }

    const result = await this.findById(id);
    if (!result) throw new Error("Order not found after update");
    return result;
  }

  async findByStatuses(statuses: OrderStatus[]): Promise<OrderRecord[]> {
    const orders = await prisma.order.findMany({
      where: { status: { in: statuses } },
      orderBy: { createdAt: "asc" },
      include: { pricing: true },
    });
    return this.attachLocations(orders);
  }

  private async attachLocations(orders: OrderWithPricing[]): Promise<OrderRecord[]> {
    if (orders.length === 0) return [];

    const ids = orders.map((o) => o.id);
    const locations = await prisma.$queryRaw<Array<{ id: string; lat: number; lng: number }>>`
      SELECT id, ST_Y(customer_location::geometry) as lat, ST_X(customer_location::geometry) as lng
      FROM orders WHERE id = ANY(${ids})
    `;
    const locationById = new Map(locations.map((l) => [l.id, { lat: l.lat, lng: l.lng }]));

    return orders.map((o) => mapToRecord(o, locationById.get(o.id) ?? { lat: 0, lng: 0 }));
  }
}
