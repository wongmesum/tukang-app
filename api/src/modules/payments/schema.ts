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

export const midtransWebhookSchema = z.object({
  order_id: z.string().min(1),
  transaction_status: z.string().min(1),
  fraud_status: z.string().optional(),
  status_code: z.string().min(1),
  gross_amount: z.union([z.string(), z.number()]).transform(String),
  signature_key: z.string().min(1),
  transaction_id: z.string().optional(),
});

export const simulatePaidSchema = z.object({
  payment_id: z.string().min(1),
});
