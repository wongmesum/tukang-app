/**
 * Dynamic application settings store.
 * Allows admin to update Redis, QRIS, and other integration configs at runtime.
 * In production, persist to database. Currently in-memory with env fallback.
 */

export interface RedisSettings {
  url: string;
  enabled: boolean;
}

export interface QrisSettings {
  provider: "midtrans" | "xendit" | "dana";
  isProduction: boolean;
  serverKey: string;
  clientKey: string;
  webhookSecret: string;
  merchantId: string;
  expiryMinutes: number;
}

export interface AppSettings {
  redis: RedisSettings;
  qris: QrisSettings;
}

// Default from env vars
const DEFAULT_SETTINGS: AppSettings = {
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    enabled: process.env.REDIS_URL ? true : false,
  },
  qris: {
    provider: (process.env.QRIS_PROVIDER as QrisSettings["provider"]) ?? "midtrans",
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
    clientKey: process.env.MIDTRANS_CLIENT_KEY ?? "",
    webhookSecret: process.env.QRIS_WEBHOOK_SECRET ?? "",
    merchantId: process.env.QRIS_MERCHANT_ID ?? "",
    expiryMinutes: Number(process.env.QRIS_EXPIRY_MINUTES ?? "15"),
  },
};

let currentSettings: AppSettings = structuredClone(DEFAULT_SETTINGS);

export function getSettings(): AppSettings {
  return structuredClone(currentSettings);
}

export function updateRedisSettings(patch: Partial<RedisSettings>): RedisSettings {
  currentSettings.redis = { ...currentSettings.redis, ...patch };
  return { ...currentSettings.redis };
}

export function updateQrisSettings(patch: Partial<QrisSettings>): QrisSettings {
  currentSettings.qris = { ...currentSettings.qris, ...patch };
  return { ...currentSettings.qris };
}

export function getRedisSettings(): RedisSettings {
  return { ...currentSettings.redis };
}

export function getQrisSettings(): QrisSettings {
  return { ...currentSettings.qris };
}
