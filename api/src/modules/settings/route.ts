import { Hono } from "hono";
import { z } from "zod";
import { adminMiddleware } from "../../shared/admin-middleware";
import { getRedisClient, reconfigureRedis } from "../../shared/redis";
import {
  getGoogleAuthSettings,
  getOtpSettings,
  getQrisSettings,
  getRedisSettings,
  maskRedisUrl,
  maskSecret,
  updateGoogleAuthSettings,
  updateOtpSettings,
  updateQrisSettings,
  updateRedisSettings,
} from "./config-store";

const settingsRouter = new Hono();
settingsRouter.use("*", adminMiddleware);

const redisSchema = z.object({
  url: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

const qrisSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.literal("midtrans").optional(),
  is_production: z.boolean().optional(),
  server_key: z.string().min(1).optional(),
  client_key: z.string().min(1).optional(),
  webhook_secret: z.string().min(16).optional(),
  merchant_id: z.string().optional(),
  expiry_minutes: z.number().int().min(5).max(60).optional(),
});

const otpSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.enum(["fonnte", "console"]).optional(),
  api_token: z.string().min(1).optional(),
  expiry_seconds: z.number().int().min(60).max(900).optional(),
  max_attempts: z.number().int().min(1).max(10).optional(),
  message_template: z.string().min(10).max(500).optional(),
});

const googleSchema = z.object({
  enabled: z.boolean().optional(),
  web_client_id: z.string().optional(),
  android_client_id: z.string().optional(),
  ios_client_id: z.string().optional(),
});

function publicAdminSettings() {
  const redis = getRedisSettings();
  const qris = getQrisSettings();
  const otp = getOtpSettings();
  const google = getGoogleAuthSettings();
  return {
    redis: {
      enabled: redis.enabled,
      url: maskRedisUrl(redis.url),
      configured: Boolean(redis.url),
      status: getRedisClient() ? "connected" : redis.enabled ? "disconnected" : "disabled",
    },
    qris: {
      enabled: qris.enabled,
      provider: qris.provider,
      is_production: qris.isProduction,
      server_key: maskSecret(qris.serverKey),
      client_key: maskSecret(qris.clientKey),
      webhook_secret: maskSecret(qris.webhookSecret),
      merchant_id: qris.merchantId,
      expiry_minutes: qris.expiryMinutes,
    },
    otp: {
      enabled: otp.enabled,
      provider: otp.provider,
      api_token: maskSecret(otp.apiToken),
      expiry_seconds: otp.expirySeconds,
      max_attempts: otp.maxAttempts,
      message_template: otp.messageTemplate,
    },
    google_auth: {
      enabled: google.enabled,
      web_client_id: google.webClientId,
      android_client_id: google.androidClientId,
      ios_client_id: google.iosClientId,
    },
  };
}

settingsRouter.get("/", (context) =>
  context.json({ success: true, data: publicAdminSettings() }),
);

settingsRouter.put("/redis", async (context) => {
  const parsed = redisSchema.safeParse(await context.req.json());
  if (!parsed.success) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Konfigurasi Redis tidak valid" } }, 400);
  }
  const updated = updateRedisSettings(parsed.data);
  const client = await reconfigureRedis(updated);
  return context.json({
    success: true,
    data: {
      enabled: updated.enabled,
      status: client ? "connected" : updated.enabled ? "disconnected" : "disabled",
      message: "Konfigurasi Redis diterapkan tanpa restart server.",
    },
  });
});

settingsRouter.post("/redis/test", async (context) => {
  const redis = getRedisClient() ?? await reconfigureRedis();
  if (!redis) {
    return context.json({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Redis tidak dapat dihubungi" } }, 503);
  }
  try {
    const start = Date.now();
    await redis.ping();
    return context.json({ success: true, data: { status: "ok", latency_ms: Date.now() - start } });
  } catch (error) {
    return context.json({ success: false, error: { code: "CONNECTION_FAILED", message: error instanceof Error ? error.message : "Redis tidak dapat dihubungi" } }, 503);
  }
});

settingsRouter.put("/qris", async (context) => {
  const parsed = qrisSchema.safeParse(await context.req.json());
  if (!parsed.success) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Konfigurasi QRIS tidak valid" } }, 400);
  }
  const body = parsed.data;
  const updated = updateQrisSettings({
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    ...(body.provider !== undefined && { provider: body.provider }),
    ...(body.is_production !== undefined && { isProduction: body.is_production }),
    ...(body.server_key !== undefined && { serverKey: body.server_key }),
    ...(body.client_key !== undefined && { clientKey: body.client_key }),
    ...(body.webhook_secret !== undefined && { webhookSecret: body.webhook_secret }),
    ...(body.merchant_id !== undefined && { merchantId: body.merchant_id }),
    ...(body.expiry_minutes !== undefined && { expiryMinutes: body.expiry_minutes }),
  });
  return context.json({ success: true, data: { enabled: updated.enabled, message: "Konfigurasi QRIS langsung diterapkan." } });
});

settingsRouter.put("/otp", async (context) => {
  const parsed = otpSchema.safeParse(await context.req.json());
  if (!parsed.success) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Konfigurasi OTP tidak valid" } }, 400);
  }
  const body = parsed.data;
  const updated = updateOtpSettings({
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    ...(body.provider !== undefined && { provider: body.provider }),
    ...(body.api_token !== undefined && { apiToken: body.api_token }),
    ...(body.expiry_seconds !== undefined && { expirySeconds: body.expiry_seconds }),
    ...(body.max_attempts !== undefined && { maxAttempts: body.max_attempts }),
    ...(body.message_template !== undefined && { messageTemplate: body.message_template }),
  });
  return context.json({ success: true, data: { enabled: updated.enabled, message: "Konfigurasi OTP langsung diterapkan." } });
});

settingsRouter.put("/google-auth", async (context) => {
  const parsed = googleSchema.safeParse(await context.req.json());
  if (!parsed.success) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Konfigurasi Google Auth tidak valid" } }, 400);
  }
  const body = parsed.data;
  const updated = updateGoogleAuthSettings({
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    ...(body.web_client_id !== undefined && { webClientId: body.web_client_id }),
    ...(body.android_client_id !== undefined && { androidClientId: body.android_client_id }),
    ...(body.ios_client_id !== undefined && { iosClientId: body.ios_client_id }),
  });
  return context.json({ success: true, data: { enabled: updated.enabled, message: "Google Login langsung diterapkan." } });
});

export { settingsRouter };
