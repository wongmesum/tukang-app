import { Hono } from "hono";
import { adminMiddleware } from "../../shared/admin-middleware";
import {
  getSettings,
  getRedisSettings,
  getQrisSettings,
  updateRedisSettings,
  updateQrisSettings,
} from "./config-store";
import { redis } from "../../shared/redis";

const settingsRouter = new Hono();
settingsRouter.use("*", adminMiddleware);

// GET /admin/settings — get all settings
settingsRouter.get("/", async (context) => {
  const settings = getSettings();

  // Mask sensitive keys (show only last 4 chars)
  const maskedQris = {
    ...settings.qris,
    serverKey: settings.qris.serverKey ? `****${settings.qris.serverKey.slice(-4)}` : "",
    clientKey: settings.qris.clientKey ? `****${settings.qris.clientKey.slice(-4)}` : "",
    webhookSecret: settings.qris.webhookSecret ? `****${settings.qris.webhookSecret.slice(-4)}` : "",
  };

  return context.json({
    success: true,
    data: {
      redis: {
        ...settings.redis,
        status: redis ? "connected" : "not_connected",
      },
      qris: maskedQris,
    },
  });
});

// GET /admin/settings/redis — get Redis settings + live status
settingsRouter.get("/redis", async (context) => {
  const redisSettings = getRedisSettings();

  let status = "not_configured";
  let latencyMs: number | null = null;

  if (redis) {
    try {
      const start = Date.now();
      await redis.ping();
      latencyMs = Date.now() - start;
      status = "connected";
    } catch {
      status = "error";
    }
  } else if (redisSettings.enabled) {
    status = "disconnected";
  }

  return context.json({
    success: true,
    data: {
      url: redisSettings.url,
      enabled: redisSettings.enabled,
      status,
      latency_ms: latencyMs,
    },
  });
});

// PUT /admin/settings/redis — update Redis settings
settingsRouter.put("/redis", async (context) => {
  const body = await context.req.json() as {
    url?: string;
    enabled?: boolean;
  };

  const updated = updateRedisSettings({
    ...(body.url !== undefined && { url: body.url }),
    ...(body.enabled !== undefined && { enabled: body.enabled }),
  });

  return context.json({
    success: true,
    data: {
      ...updated,
      message: "Konfigurasi Redis berhasil diperbarui. Restart server untuk menerapkan koneksi baru.",
    },
  });
});

// GET /admin/settings/qris — get QRIS settings
settingsRouter.get("/qris", async (context) => {
  const qris = getQrisSettings();

  return context.json({
    success: true,
    data: {
      provider: qris.provider,
      is_production: qris.isProduction,
      server_key: qris.serverKey ? `****${qris.serverKey.slice(-4)}` : "",
      client_key: qris.clientKey ? `****${qris.clientKey.slice(-4)}` : "",
      webhook_secret: qris.webhookSecret ? `****${qris.webhookSecret.slice(-4)}` : "",
      merchant_id: qris.merchantId,
      expiry_minutes: qris.expiryMinutes,
    },
  });
});

// PUT /admin/settings/qris — update QRIS settings
settingsRouter.put("/qris", async (context) => {
  const body = await context.req.json() as {
    provider?: string;
    is_production?: boolean;
    server_key?: string;
    client_key?: string;
    webhook_secret?: string;
    merchant_id?: string;
    expiry_minutes?: number;
  };

  const patch: Record<string, unknown> = {};
  if (body.provider && ["midtrans", "xendit", "dana"].includes(body.provider)) {
    patch.provider = body.provider;
  }
  if (body.is_production !== undefined) patch.isProduction = body.is_production;
  if (body.server_key) patch.serverKey = body.server_key;
  if (body.client_key) patch.clientKey = body.client_key;
  if (body.webhook_secret) patch.webhookSecret = body.webhook_secret;
  if (body.merchant_id !== undefined) patch.merchantId = body.merchant_id;
  if (body.expiry_minutes !== undefined) patch.expiryMinutes = body.expiry_minutes;

  const updated = updateQrisSettings(patch as Parameters<typeof updateQrisSettings>[0]);

  return context.json({
    success: true,
    data: {
      provider: updated.provider,
      is_production: updated.isProduction,
      merchant_id: updated.merchantId,
      expiry_minutes: updated.expiryMinutes,
      message: "Konfigurasi QRIS berhasil diperbarui.",
    },
  });
});

// POST /admin/settings/redis/test — test Redis connection
settingsRouter.post("/redis/test", async (context) => {
  if (!redis) {
    return context.json({
      success: false,
      error: { code: "SERVICE_UNAVAILABLE", message: "Redis client tidak aktif. Aktifkan dulu dan restart server." },
    }, 503);
  }

  try {
    const start = Date.now();
    const pong = await redis.ping();
    const latency = Date.now() - start;

    return context.json({
      success: true,
      data: {
        status: "ok",
        response: pong,
        latency_ms: latency,
      },
    });
  } catch (err) {
    return context.json({
      success: false,
      error: {
        code: "CONNECTION_FAILED",
        message: err instanceof Error ? err.message : "Redis tidak dapat dihubungi",
      },
    }, 503);
  }
});

export { settingsRouter };
