import { randomUUID } from "crypto";
import type {
  CreateDisputeInput,
  DisputeRecord,
  DisputeRepository,
  DisputeStatus,
  ResolveDisputeInput,
} from "./types";

const disputes = new Map<string, DisputeRecord>();

export class InMemoryDisputeRepository implements DisputeRepository {
  async create(input: CreateDisputeInput): Promise<DisputeRecord> {
    const record: DisputeRecord = {
      id: randomUUID(),
      orderId: input.orderId,
      filedById: input.filedById,
      filedByRole: input.filedByRole,
      reason: input.reason,
      photos: [...input.photos],
      status: "open",
      resolution: null,
      refunded: false,
      resolvedAt: null,
      createdAt: new Date(),
    };
    disputes.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<DisputeRecord | null> {
    return disputes.get(id) ?? null;
  }

  async findOpenByOrderId(orderId: string): Promise<DisputeRecord | null> {
    return (
      [...disputes.values()].find(
        (d) => d.orderId === orderId && d.status === "open",
      ) ?? null
    );
  }

  async findByOrderId(orderId: string): Promise<DisputeRecord[]> {
    return [...disputes.values()]
      .filter((d) => d.orderId === orderId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByStatus(status: DisputeStatus): Promise<DisputeRecord[]> {
    return [...disputes.values()]
      .filter((d) => d.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async resolve(id: string, input: ResolveDisputeInput): Promise<DisputeRecord> {
    const current = disputes.get(id);
    if (!current) throw new Error("Dispute not found");

    const updated: DisputeRecord = {
      ...current,
      status: "resolved",
      resolution: input.resolution,
      refunded: input.refunded,
      resolvedAt: new Date(),
    };
    disputes.set(id, updated);
    return updated;
  }
}

import { shouldUsePrisma } from "../../shared/repository-factory";
import { PrismaDisputeRepository } from "./prisma-repository";

const memoryRepo = new InMemoryDisputeRepository();
export const disputeRepo: DisputeRepository = shouldUsePrisma()
  ? new PrismaDisputeRepository()
  : memoryRepo;
