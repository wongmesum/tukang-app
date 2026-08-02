import { randomUUID } from "crypto";
import type { CreateReviewInput, ReviewRecord, ReviewRepository } from "./types";

const reviews = new Map<string, ReviewRecord>();

export class InMemoryReviewRepository implements ReviewRepository {
  async create(input: CreateReviewInput): Promise<ReviewRecord> {
    const review: ReviewRecord = {
      id: randomUUID(),
      orderId: input.orderId,
      customerId: input.customerId,
      workerId: input.workerId,
      rating: input.rating,
      comment: input.comment,
      photos: [...input.photos],
      createdAt: new Date(),
    };
    reviews.set(review.id, review);
    return review;
  }

  async findByOrderId(orderId: string): Promise<ReviewRecord | null> {
    for (const review of reviews.values()) {
      if (review.orderId === orderId) return review;
    }
    return null;
  }

  async findByWorkerId(workerId: string): Promise<ReviewRecord[]> {
    return [...reviews.values()].filter((r) => r.workerId === workerId);
  }
}

import { shouldUsePrisma } from "../../shared/repository-factory";
import { PrismaReviewRepository } from "./prisma-repository";

// ... existing code ...

const memoryRepo = new InMemoryReviewRepository();
export const reviewRepo = shouldUsePrisma() ? new PrismaReviewRepository() : memoryRepo;
