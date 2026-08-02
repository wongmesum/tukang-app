import { z } from "zod";

export const otpRequestSchema = z.object({
  phone: z
    .string()
    .min(10, "Nomor HP minimal 10 digit")
    .max(15, "Nomor HP maksimal 15 digit")
    .regex(/^08\d+$/, "Format nomor HP tidak valid"),
});

export const otpVerifySchema = z.object({
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^08\d+$/),
  code: z
    .string()
    .length(6, "Kode OTP harus 6 digit")
    .regex(/^\d{6}$/, "Kode OTP harus angka"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Format email tidak valid").optional(),
});

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
