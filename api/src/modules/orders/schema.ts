import { z } from "zod";

export const createOrderSchema = z.object({
  service_id: z.string().min(1),
  pricing_scheme: z.enum(["hourly", "daily"]),
  estimated_duration: z.number().int().min(1),
  description: z.string().max(2000).nullable().optional(),
  photos: z.array(z.string().url()).max(10).default([]),
  address_id: z.string().min(1),
  customer_location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
  pricing: z.object({
    base_rate: z.number().int().nonnegative(),
    distance_km: z.number().nonnegative(),
    travel_cost: z.number().int().nonnegative(),
    surcharge: z.object({
      holiday: z.number().int().nonnegative().default(0),
      night: z.number().int().nonnegative().default(0),
      weekend: z.number().int().nonnegative().default(0),
      urgent: z.number().int().nonnegative().default(0),
      floor: z.number().int().nonnegative().default(0),
    }),
    total_estimate: z.number().int().nonnegative(),
  }),
});

export const rejectOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const cancelOrderSchema = z.object({
  reason_code: z.enum([
    "changed_mind",
    "wrong_service",
    "wrong_schedule",
    "found_other",
    "price_too_high",
    "emergency",
    "worker_too_far",
    "other",
  ]),
  reason_detail: z.string().max(500).optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderSchema>;
