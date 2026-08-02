import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).nullable().optional(),
  photos: z.array(z.string().url()).max(5).default([]),
});

export type CreateReviewRequest = z.infer<typeof createReviewSchema>;
