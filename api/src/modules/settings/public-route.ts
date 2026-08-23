import { Hono } from "hono";
import {
  getGoogleAuthSettings,
  getOtpSettings,
  getQrisSettings,
} from "./config-store";

const publicConfigRouter = new Hono();

publicConfigRouter.get("/public", (context) => {
  const qris = getQrisSettings();
  const otp = getOtpSettings();
  const google = getGoogleAuthSettings();
  return context.json({
    success: true,
    data: {
      features: {
        qris_enabled: qris.enabled,
        otp_enabled: otp.enabled,
        google_auth_enabled: google.enabled && Boolean(google.webClientId),
      },
      auth: {
        otp_expiry_seconds: otp.expirySeconds,
        google_web_client_id: google.webClientId,
      },
      payment: {
        qris_provider: qris.provider,
        qris_expiry_minutes: qris.expiryMinutes,
      },
    },
  });
});

export { publicConfigRouter };
