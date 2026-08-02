import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

export const createAddressSchema = z.object({
  label: z.string().min(1).max(50),
  full_address: z.string().min(5).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  district: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  is_default: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();
