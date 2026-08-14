import { prisma } from "../../shared/prisma";
import type {
  CreateDisputeInput,
  DisputeRecord,
  DisputeRepository,
  DisputeStatus,
  ResolveDisputeInput,
} from "./types";
import type { Dispute } from "@prisma/client";

function mapToRecord(d: Dispute): DisputeRecord {
  return {
    id: d.id,
    orderId: d.orderId,
    filedById: d.filedById,
    filedByRole: d.filedByRole as DisputeRecord["filedByRole"],
    reason: d.reason,
    photos: d.photos,
    status: d.status as DisputeStatus,
    resolution: d.resolution,
    refunded: d.refunded,
    resolvedAt: d.resolvedAt,
    createdAt: d.createdAt,
  };
}

export class PrismaDisputeRepository implements DisputeRepository {
  async create(input: CreateDisputeInput): Promise<DisputeRecord> {
    const dispute = await prisma.dispute.create({
      data: {
        orderId: input.orderId,
        filedById: input.filedById,
        filedByRole: input.filedByRole,
        reason: input.reason,
        photos: input.photos,
      },
    });
    return mapToRecord(dispute);
  }

  async findById(id: string): Promise<DisputeRecord | null> {
    const dispute = await prisma.dispute.findUnique({ where: { id } });
    return dispute ? mapToRecord(dispute) : null;
  }

  async findOpenByOrderId(orderId: string): Promise<DisputeRecord | null> {
    const dispute = await prisma.dispute.findFirst({
      where: { orderId, status: "open" },
    });
    return dispute ? mapToRecord(dispute) : null;
  }

  async findByOrderId(orderId: string): Promise<DisputeRecord[]> {
    const items = await prisma.dispute.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });
    return items.map(mapToRecord);
  }

  async findByStatus(status: DisputeStatus): Promise<DisputeRecord[]> {
    const items = await prisma.dispute.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
    });
    return items.map(mapToRecord);
  }

  async resolve(id: string, input: ResolveDisputeInput): Promise<DisputeRecord> {
    const dispute = await prisma.dispute.update({
      where: { id },
      data: {
        status: "resolved",
        resolution: input.resolution,
        refunded: input.refunded,
        resolvedAt: new Date(),
      },
    });
    return mapToRecord(dispute);
  }
}
