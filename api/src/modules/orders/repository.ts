import { randomUUID } from "crypto";
import type { CreateOrderInput, OrderRecord, OrderRepository } from "./types";
import type { OrderStatus } from "./state-machine";

const orders = new Map<string, OrderRecord>();

function createOrderNumber(now: Date): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `ORD-${date}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

export class InMemoryOrderRepository implements OrderRepository {
  async create(input: CreateOrderInput): Promise<OrderRecord> {
    const now = new Date();
    const order: OrderRecord = {
      id: randomUUID(),
      orderNumber: createOrderNumber(now),
      customerId: input.customerId,
      workerId: null,
      serviceId: input.serviceId,
      status: "PENDING",
      pricingScheme: input.pricingScheme,
      estimatedDuration: input.estimatedDuration,
      description: input.description,
      photos: [...input.photos],
      addressId: input.addressId,
      customerLocation: { ...input.customerLocation },
      scheduledAt: input.scheduledAt,
      matchedAt: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      pricing: { ...input.pricing },
    };
    orders.set(order.id, order);
    return order;
  }

  async findByStatuses(statuses: OrderStatus[]): Promise<OrderRecord[]> {
    return [...orders.values()].filter((order) => statuses.includes(order.status));
  }

  async findById(id: string): Promise<OrderRecord | null> {
    return orders.get(id) ?? null;
  }

  async findByCustomerId(customerId: string): Promise<OrderRecord[]> {
    return [...orders.values()].filter((order) => order.customerId === customerId);
  }

  async findIncoming(workerId: string): Promise<OrderRecord[]> {
    return [...orders.values()].filter(
      (order) =>
        order.status === "PENDING" ||
        (order.status === "MATCHED" && order.workerId === workerId),
    );
  }

  async findActive(workerId: string): Promise<OrderRecord[]> {
    const activeStatuses = ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"];
    return [...orders.values()].filter(
      (order) => order.workerId === workerId && activeStatuses.includes(order.status),
    );
  }

  async findHistory(workerId: string): Promise<OrderRecord[]> {
    const historyStatuses = [
      "COMPLETED",
      "PAID",
      "REVIEWED",
      "CANCELLED_BY_CUSTOMER",
      "CANCELLED_BY_WORKER",
      "DISPUTED",
      "EXPIRED",
    ];
    return [...orders.values()].filter(
      (order) => order.workerId === workerId && historyStatuses.includes(order.status),
    );
  }

  async update(id: string, patch: Partial<OrderRecord>): Promise<OrderRecord> {
    const current = orders.get(id);
    if (!current) throw new Error("Order not found");
    const updated: OrderRecord = { ...current, ...patch };
    orders.set(id, updated);
    return updated;
  }
}

import { shouldUsePrisma } from "../../shared/repository-factory";
import { PrismaOrderRepository } from "./prisma-repository";

// ... existing code ...

const memoryRepo = new InMemoryOrderRepository();
export const orderRepo = shouldUsePrisma() ? new PrismaOrderRepository() : memoryRepo;
