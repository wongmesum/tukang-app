import { prisma } from "../../shared/prisma";
import type { CreateReviewInput, ReviewRecord, ReviewRepository } from "./types";
import type { Review } from "../../generated/prisma";

function mapToRecord(r: Review): ReviewRecord {
  return {
    id: r.id,
    orderId: r.orderId,
    customerId: r.customerId,
    workerId: r.workerId,
    rating: r.rating,
    comment: r.comment,
    photos: r.photos,
    createdAt: r.createdAt,
  };
}

export class PrismaReviewRepository implements ReviewRepository {
  async create(input: CreateReviewInput): Promise<ReviewRecord> {
    const review = await prisma.review.create({
      data: {
        orderId: input.orderId,
        customerId: input.customerId,
        workerId: input.workerId,
        rating: input.rating,
        comment: input.comment,
        photos: input.photos,
      },
    });
    return mapToRecord(review);
  }

  async findByOrderId(orderId: string): Promise<ReviewRecord | null> {
    const review = await prisma.review.findUnique({ where: { orderId } });
    if (!review) return null;
    return mapToRecord(review);
  }

  async findByWorkerId(workerId: string): Promise<ReviewRecord[]> {
    const reviews = await prisma.review.findMany({
      where: { workerId },
      orderBy: { createdAt: "desc" },
    });
    return reviews.map(mapToRecord);
  }
}
