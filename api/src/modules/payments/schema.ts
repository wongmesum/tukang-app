import { z } from "zod";

export const createQrisSchema = z.object({
  order_id: z.string().min(1),
});

export const webhookSchema = z.object({
  payment_id: z.string().min(1),
  status: z.enum(["paid", "expired", "failed"]),
  reference: z.string().min(1),
  signature: z.string().optional(),
});

export const simulatePaidSchema = z.object({
  payment_id: z.string().min(1),
});
