export interface MessageRecord {
  id: string;
  orderId: string;
  senderId: string;
  content: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateMessageInput {
  orderId: string;
  senderId: string;
  content: string;
}

export interface MessageRepository {
  create(input: CreateMessageInput): Promise<MessageRecord>;
  /** Oldest first — chat reads top to bottom. */
  findByOrderId(orderId: string): Promise<MessageRecord[]>;
  /**
   * Marks every message on the order that the reader did not send as read.
   * Returns how many rows changed.
   */
  markReadForReader(orderId: string, readerId: string): Promise<number>;
  /** Unread messages addressed to this reader. */
  countUnreadForReader(orderId: string, readerId: string): Promise<number>;
}
