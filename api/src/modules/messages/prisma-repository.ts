import { prisma } from "../../shared/prisma";
import type { CreateMessageInput, MessageRecord, MessageRepository } from "./types";
import type { Message } from "@prisma/client";

function mapToRecord(m: Message): MessageRecord {
  return {
    id: m.id,
    orderId: m.orderId,
    senderId: m.senderId,
    content: m.content,
    readAt: m.readAt,
    createdAt: m.createdAt,
  };
}

export class PrismaMessageRepository implements MessageRepository {
  async create(input: CreateMessageInput): Promise<MessageRecord> {
    const message = await prisma.message.create({
      data: {
        orderId: input.orderId,
        senderId: input.senderId,
        content: input.content,
      },
    });
    return mapToRecord(message);
  }

  async findByOrderId(orderId: string): Promise<MessageRecord[]> {
    const items = await prisma.message.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    });
    return items.map(mapToRecord);
  }

  async markReadForReader(orderId: string, readerId: string): Promise<number> {
    const result = await prisma.message.updateMany({
      where: {
        orderId,
        senderId: { not: readerId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async countUnreadForReader(orderId: string, readerId: string): Promise<number> {
    return prisma.message.count({
      where: {
        orderId,
        senderId: { not: readerId },
        readAt: null,
      },
    });
  }
}
