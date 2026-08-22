import { createHash } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { Hono } from "hono";
import { z } from "zod";
import { getGoogleAuthSettings } from "../settings/config-store";
import { userRepo } from "../users/repository";
import { generateTokenPair } from "./jwt";

const googleAuthRouter = new Hono();
const client = new OAuth2Client();

const googleTokenSchema = z.object({
  id_token: z.string().min(20),
});

function syntheticGooglePhone(subject: string): string {
  return `g${createHash("sha256").update(subject).digest("hex").slice(0, 14)}`;
}

googleAuthRouter.post("/", async (context) => {
  const settings = getGoogleAuthSettings();
  if (!settings.enabled) {
    return context.json({ success: false, error: { code: "GOOGLE_AUTH_DISABLED", message: "Login Google sedang dinonaktifkan" } }, 503);
  }

  const audiences = [settings.webClientId, settings.androidClientId, settings.iosClientId].filter(Boolean);
  if (audiences.length === 0) {
    return context.json({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Google Login belum dikonfigurasi" } }, 503);
  }

  const parsed = googleTokenSchema.safeParse(await context.req.json());
  if (!parsed.success) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Google ID token wajib diisi" } }, 400);
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: parsed.data.id_token,
      audience: audiences,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return context.json({ success: false, error: { code: "INVALID_GOOGLE_ACCOUNT", message: "Akun Google tidak valid atau email belum diverifikasi" } }, 401);
    }

    let user = await userRepo.findByEmail(payload.email);
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = await userRepo.create({
        phone: syntheticGooglePhone(payload.sub),
        name: payload.name?.trim() || payload.email.split("@")[0],
        role: "customer",
      });
    }

    user = await userRepo.update(user.id, {
      email: payload.email,
      name: payload.name?.trim() || user.name,
      avatarUrl: payload.picture ?? user.avatarUrl,
    });

    const tokens = generateTokenPair({ userId: user.id, role: user.role });
    return context.json({
      success: true,
      data: {
        token: tokens.token,
        refresh_token: tokens.refreshToken,
        is_new_user: isNewUser,
        user: {
          id: user.id,
          phone: user.phone.startsWith("g") ? null : user.phone,
          name: user.name,
          email: user.email,
          avatar_url: user.avatarUrl,
          role: user.role,
          is_verified: true,
        },
      },
    });
  } catch {
    return context.json({ success: false, error: { code: "INVALID_GOOGLE_TOKEN", message: "Token Google tidak valid atau sudah kedaluwarsa" } }, 401);
  }
});

export { googleAuthRouter };
