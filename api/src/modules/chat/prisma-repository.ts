import { prisma } from "../../shared/prisma";
import type { ChatMessage, ChatRepository, CreateChatMessageInput } from "./types";
import { randomUUID } from "crypto";

interface ChatMessageRow {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  sent_at: Date;
}

function mapRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    orderId: row.order_id,
    senderId: row.sender_id,
    senderRole: row.sender_role as ChatMessage["senderRole"],
    content: row.content,
    sentAt: row.sent_at,
  };
}

export class PrismaChatRepository implements ChatRepository {
  async create(input: CreateChatMessageInput): Promise<ChatMessage> {
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO chat_messages (id, order_id, sender_id, sender_role, content, sent_at)
      VALUES (${id}, ${input.orderId}, ${input.senderId}, ${input.senderRole}, ${input.content}, CURRENT_TIMESTAMP)
    `;

    const rows = await prisma.$queryRaw<ChatMessageRow[]>`
      SELECT id, order_id, sender_id, sender_role, content, sent_at
      FROM chat_messages WHERE id = ${id}
    `;

    return mapRow(rows[0]!);
  }

  async findByOrderId(orderId: string): Promise<ChatMessage[]> {
    const rows = await prisma.$queryRaw<ChatMessageRow[]>`
      SELECT id, order_id, sender_id, sender_role, content, sent_at
      FROM chat_messages WHERE order_id = ${orderId}
      ORDER BY sent_at ASC
    `;
    return rows.map(mapRow);
  }
}
