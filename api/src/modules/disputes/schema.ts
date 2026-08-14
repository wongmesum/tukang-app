import { z } from "zod";

export const createDisputeSchema = z.object({
  reason: z
    .string()
    .min(10, "Alasan minimal 10 karakter agar admin bisa menindaklanjuti")
    .max(1000, "Alasan maksimal 1000 karakter"),
  photos: z.array(z.string().url()).max(5, "Maksimal 5 foto bukti").default([]),
});

export const resolveDisputeSchema = z.object({
  resolution: z
    .string()
    .min(5, "Catatan resolusi wajib diisi")
    .max(1000),
  refund: z.boolean().default(false),
});
