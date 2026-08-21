import { z } from "zod";

// Test-mode defaults: injected when NODE_ENV=test so tests can run without
// a .env file, from any working directory (root repo or api/). These values
// are only used during test runs — production still requires explicit env.
const TEST_DEFAULTS = {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test?schema=public",
  JWT_SECRET: "test-secret-tukangndeso-vitest-fallback",
} as const;

if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
  process.env.NODE_ENV = "test";
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = TEST_DEFAULTS.DATABASE_URL;
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = TEST_DEFAULTS.JWT_SECRET;
  if (!process.env.QRIS_WEBHOOK_SECRET) process.env.QRIS_WEBHOOK_SECRET = "test-webhook-secret-qris-vitest";
}

const PLACEHOLDER_SECRETS = new Set([
  "change-me-in-production",
  "changeme",
  "secret",
  "your-secret-here",
]);

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: z.string().url(),
  REPOSITORY_MODE: z.enum(["memory", "prisma"]).optional(),

  JWT_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  OTP_EXPIRY_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3010,http://localhost:5173"),

  QRIS_WEBHOOK_SECRET: z.string().min(1).optional(),
  REDIS_URL: z.string().optional(),
  CDN_BASE_URL: z.string().url().optional(),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().default(5),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    throw new Error(`Invalid env config: ${JSON.stringify(formatted)}`);
  }

  const value = result.data;

  if (value.NODE_ENV === "production") {
    if (PLACEHOLDER_SECRETS.has(value.JWT_SECRET) || value.JWT_SECRET.length < 32) {
      throw new Error(
        "JWT_SECRET must be a strong, non-placeholder secret of at least 32 characters in production",
      );
    }
    if (!value.QRIS_WEBHOOK_SECRET) {
      throw new Error("QRIS_WEBHOOK_SECRET must be configured in production");
    }
  }

  return value;
}

export const env = loadEnv();
