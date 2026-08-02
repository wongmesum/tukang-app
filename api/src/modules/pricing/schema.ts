import { z } from "zod";

export const pricingEstimateSchema = z.object({
  // Not strictly UUID — seed service ids use a slug format (e.g. "seed-AC-cuci-ac-split")
  service_id: z.string().min(1),
  pricing_scheme: z.enum(["hourly", "daily"]),
  duration: z.number().int().min(1),
  customer_location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  scheduled_at: z.string().datetime({ offset: true }).nullable(),
  floor_level: z.number().int().min(1).default(1),
  is_urgent: z.boolean().default(false),
});

export type PricingEstimateRequest = z.infer<typeof pricingEstimateSchema>;
