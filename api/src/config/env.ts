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
  if (!process.env.INTERNAL_JOB_SECRET) process.env.INTERNAL_JOB_SECRET = "test-internal-job-secret";
}

const PLACEHOLDER_SECRETS = new Set([
  "change-me-in-production",
  "changeme",
  "secret",
  "your-secret-here",
]);

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const optionalUrl = z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional());
const optionalString = z.preprocess((value) => value === "" ? undefined : value, z.string().optional());

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
  REDIS_URL: optionalString,
  REDIS_DRIVER: z.enum(["ioredis", "rest", "none"]).default("ioredis"),
  REDIS_REST_URL: optionalUrl,
  REDIS_REST_TOKEN: optionalString,
  REDIS_REQUIRED: booleanFromEnv.default(false),

  // Explicit runtime identity keeps cPanel defaults separate from Wasmer.
  DEPLOYMENT_TARGET: z.enum(["cpanel", "wasmer"]).default("cpanel"),

  // Upload storage. Keep local as the migration-safe default for cPanel/dev.
  // Wasmer staging/production should use r2.
  UPLOAD_STORAGE: z.enum(["local", "r2"]).default("local"),
  S3_ENDPOINT: optionalUrl,
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY: optionalString,
  S3_SECRET_KEY: optionalString,
  S3_REGION: z.string().default("auto"),
  CDN_BASE_URL: optionalUrl,
  UPLOAD_MAX_SIZE_MB: z.coerce.number().default(5),

  // During migration cPanel/local can keep the legacy interval enabled.
  // Stateless runtimes should set this to false and trigger internal jobs externally.
  BACKGROUND_JOBS_ENABLED: booleanFromEnv.default(true),
  INTERNAL_JOB_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    throw new Error(`Invalid env config: ${JSON.stringify(formatted)}`);
  }

  const value = result.data;

  if (value.UPLOAD_STORAGE === "r2") {
    const requiredR2 = {
      S3_ENDPOINT: value.S3_ENDPOINT,
      S3_BUCKET: value.S3_BUCKET,
      S3_ACCESS_KEY: value.S3_ACCESS_KEY,
      S3_SECRET_KEY: value.S3_SECRET_KEY,
      CDN_BASE_URL: value.CDN_BASE_URL,
    };
    const missing = Object.entries(requiredR2).filter(([, configured]) => !configured).map(([key]) => key);
    if (missing.length > 0) {
      throw new Error(`R2 upload configuration missing: ${missing.join(", ")}`);
    }
  }

  if (value.NODE_ENV === "production") {
    if (PLACEHOLDER_SECRETS.has(value.JWT_SECRET) || value.JWT_SECRET.length < 32) {
      throw new Error(
        "JWT_SECRET must be a strong, non-placeholder secret of at least 32 characters in production",
      );
    }
    if (!value.QRIS_WEBHOOK_SECRET) {
      throw new Error("QRIS_WEBHOOK_SECRET must be configured in production");
    }
    if (!value.BACKGROUND_JOBS_ENABLED && !value.INTERNAL_JOB_SECRET) {
      throw new Error(
        "INTERNAL_JOB_SECRET must be configured when BACKGROUND_JOBS_ENABLED=false in production",
      );
    }
    if (value.REDIS_REQUIRED && value.REDIS_DRIVER === "none") {
      throw new Error("REDIS_DRIVER cannot be none when REDIS_REQUIRED=true");
    }
    if (value.REDIS_DRIVER === "rest" && (!value.REDIS_REST_URL || !value.REDIS_REST_TOKEN)) {
      throw new Error("REDIS_REST_URL and REDIS_REST_TOKEN are required for the REST Redis driver");
    }
    if (value.REDIS_REQUIRED && value.REDIS_DRIVER === "ioredis" && !value.REDIS_URL) {
      throw new Error("REDIS_URL is required for the ioredis driver when Redis is mandatory");
    }
  }

  return value;
}

export const env = loadEnv();
