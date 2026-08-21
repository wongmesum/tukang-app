import { randomUUID } from "crypto";
import type { ChatMessage, ChatRepository, CreateChatMessageInput } from "./types";
import { shouldUsePrisma } from "../../shared/repository-factory";
import { PrismaChatRepository } from "./prisma-repository";

const messages: ChatMessage[] = [];

export class InMemoryChatRepository implements ChatRepository {
  async create(input: CreateChatMessageInput): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id: randomUUID(),
      orderId: input.orderId,
      senderId: input.senderId,
      senderRole: input.senderRole,
      content: input.content,
      sentAt: new Date(),
    };
    messages.push(msg);
    return msg;
  }

  async findByOrderId(orderId: string): Promise<ChatMessage[]> {
    return messages
      .filter((m) => m.orderId === orderId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }
}

const memoryRepo = new InMemoryChatRepository();
export const chatRepo: ChatRepository = shouldUsePrisma() ? new PrismaChatRepository() : memoryRepo;
