import { randomUUID } from "crypto";
import type { CreateMessageInput, MessageRecord, MessageRepository } from "./types";

const messages = new Map<string, MessageRecord>();

export class InMemoryMessageRepository implements MessageRepository {
  async create(input: CreateMessageInput): Promise<MessageRecord> {
    const record: MessageRecord = {
      id: randomUUID(),
      orderId: input.orderId,
      senderId: input.senderId,
      content: input.content,
      readAt: null,
      createdAt: new Date(),
    };
    messages.set(record.id, record);
    return record;
  }

  async findByOrderId(orderId: string): Promise<MessageRecord[]> {
    return [...messages.values()]
      .filter((m) => m.orderId === orderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async markReadForReader(orderId: string, readerId: string): Promise<number> {
    let changed = 0;
    const now = new Date();

    for (const [id, message] of messages.entries()) {
      // Only the recipient's view is updated — a sender never "reads" their own.
      if (
        message.orderId === orderId &&
        message.senderId !== readerId &&
        message.readAt === null
      ) {
        messages.set(id, { ...message, readAt: now });
        changed += 1;
      }
    }

    return changed;
  }

  async countUnreadForReader(orderId: string, readerId: string): Promise<number> {
    return [...messages.values()].filter(
      (m) => m.orderId === orderId && m.senderId !== readerId && m.readAt === null,
    ).length;
  }
}

import { shouldUsePrisma } from "../../shared/repository-factory";
import { PrismaMessageRepository } from "./prisma-repository";

const memoryRepo = new InMemoryMessageRepository();
export const messageRepo: MessageRepository = shouldUsePrisma()
  ? new PrismaMessageRepository()
  : memoryRepo;
