export interface ReviewRecord {
  id: string;
  orderId: string;
  customerId: string;
  workerId: string;
  rating: number;
  comment: string | null;
  photos: string[];
  createdAt: Date;
}

export interface CreateReviewInput {
  orderId: string;
  customerId: string;
  workerId: string;
  rating: number;
  comment: string | null;
  photos: string[];
}

export interface ReviewRepository {
  create(input: CreateReviewInput): Promise<ReviewRecord>;
  findByOrderId(orderId: string): Promise<ReviewRecord | null>;
  findByWorkerId(workerId: string): Promise<ReviewRecord[]>;
}
