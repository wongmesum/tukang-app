import { z } from "zod";

export const registerWorkerSchema = z.object({
  ktp_number: z
    .string()
    .length(16, "Nomor KTP harus 16 digit")
    .regex(/^\d{16}$/, "Nomor KTP harus angka"),
  ktp_photo_url: z.string().url("URL foto KTP tidak valid"),
  bio: z.string().max(500).nullable().optional(),
  work_radius_km: z.number().int().min(1).max(50).default(20),
  home_location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  skills: z.array(z.string().min(1).max(10)).min(1, "Minimal 1 kategori keahlian").max(9),
});

export const updateWorkerProfileSchema = z.object({
  bio: z.string().max(500).nullable().optional(),
  work_radius_km: z.number().int().min(1).max(50).optional(),
  home_location: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
  skills: z.array(z.string().min(1).max(10)).min(1).max(9).optional(),
});

export const setAvailabilitySchema = z.object({
  is_available: z.boolean(),
  current_location: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
});

export const withdrawSchema = z.object({
  amount: z.number().int().min(10000, "Minimum penarikan Rp10.000"),
  bank_account: z.string().min(5).max(50),
  bank_name: z.string().min(2).max(50),
});
