export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: "customer" | "worker";
  content: string;
  sentAt: Date;
}

export interface CreateChatMessageInput {
  orderId: string;
  senderId: string;
  senderRole: "customer" | "worker";
  content: string;
}

export interface ChatRepository {
  create(input: CreateChatMessageInput): Promise<ChatMessage>;
  findByOrderId(orderId: string): Promise<ChatMessage[]>;
}
