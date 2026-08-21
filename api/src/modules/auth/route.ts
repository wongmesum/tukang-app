import { Hono } from "hono";
import { generateOtpCode, validateOtpRecord, OtpExpiredError, OtpInvalidError, OtpMaxAttemptsError } from "./otp";
import { generateTokenPair, verifyToken, verifyRefreshToken } from "./jwt";
import { otpRequestSchema, otpVerifySchema, refreshTokenSchema, registerSchema } from "./schema";
import { env } from "../../config/env";
import { otpLimiter } from "../../shared/rate-limit";
import { authMiddleware } from "../../shared/auth-middleware";
import { userRepo } from "../users/repository";
import { otpStore } from "./otp-store";
import { isTokenRevokedAsync, revokeToken } from "./token-revocation";
import { getOtpProvider } from "./providers";

const OTP_EXPIRY_SECONDS = env.OTP_EXPIRY_SECONDS;
const OTP_MAX_ATTEMPTS = env.OTP_MAX_ATTEMPTS;

const authRouter = new Hono();

// POST /auth/otp/request (rate limited)
authRouter.post("/otp/request", otpLimiter, async (context) => {
  const body = await context.req.json();
  const parsed = otpRequestSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const { phone } = parsed.data;
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

  await otpStore.set(phone, {
    phone,
    code,
    expiresAt,
    attempts: 0,
  });

  // Send OTP via WhatsApp (Fonnte) or console log in dev
  const otpProvider = getOtpProvider();
  await otpProvider.send(phone, code);

  return context.json({
    success: true,
    data: {
      phone,
      expires_in: OTP_EXPIRY_SECONDS,
      message: "Kode OTP telah dikirim",
      // Dev convenience only — never expose OTP in production response
      ...(env.NODE_ENV === "development" && { dev_otp_code: code }),
    },
  });
});

// POST /auth/otp/verify (rate limited)
authRouter.post("/otp/verify", otpLimiter, async (context) => {
  const body = await context.req.json();
  const parsed = otpVerifySchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const { phone, code } = parsed.data;
  const record = await otpStore.get(phone);

  if (!record) {
    return context.json(
      {
        success: false,
        error: {
          code: "INVALID_OTP",
          message: "Kode OTP tidak ditemukan. Silakan minta ulang.",
        },
      },
      400,
    );
  }

  try {
    validateOtpRecord({
      record,
      submittedCode: code,
      now: new Date(),
      maxAttempts: OTP_MAX_ATTEMPTS,
    });
  } catch (error) {
    // Increment attempts on failure and persist back to the store
    await otpStore.set(phone, { ...record, attempts: record.attempts + 1 });

    if (error instanceof OtpMaxAttemptsError) {
      await otpStore.delete(phone);
      return context.json(
        {
          success: false,
          error: {
            code: "OTP_MAX_ATTEMPTS",
            message: "Terlalu banyak percobaan. Silakan minta OTP baru.",
          },
        },
        429,
      );
    }

    if (error instanceof OtpExpiredError) {
      await otpStore.delete(phone);
      return context.json(
        {
          success: false,
          error: {
            code: "OTP_EXPIRED",
            message: "Kode OTP sudah kadaluarsa. Silakan minta ulang.",
          },
        },
        400,
      );
    }

    if (error instanceof OtpInvalidError) {
      return context.json(
        {
          success: false,
          error: {
            code: "INVALID_OTP",
            message: "Kode OTP salah",
          },
        },
        400,
      );
    }

    throw error;
  }

  // OTP valid — clean up and issue token
  await otpStore.delete(phone);

  let user = await userRepo.findByPhone(phone);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = await userRepo.create({
      phone,
      name: `User ${phone.slice(-4)}`,
      role: "customer",
    });
  }

  const tokens = generateTokenPair({
    userId: user.id,
    role: user.role,
  });

  return context.json({
    success: true,
    data: {
      token: tokens.token,
      refresh_token: tokens.refreshToken,
      is_new_user: isNewUser,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        is_verified: user.isVerified,
      },
    },
  });
});

// POST /auth/register (complete profile after OTP)
authRouter.post("/register", async (context) => {
  const authHeader = context.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return context.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Token tidak ditemukan",
        },
      },
      401,
    );
  }

  const body = await context.req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const payload = verifyToken(authHeader.slice(7));
  const updated = await userRepo.update(payload.userId, {
    name: parsed.data.name,
    email: parsed.data.email ?? null,
  });

  return context.json({
    success: true,
    data: {
      message: "Profil berhasil dilengkapi",
      user: {
        id: updated.id,
        phone: updated.phone,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        is_verified: updated.isVerified,
      },
    },
  });
});

// POST /auth/refresh — issue new token pair from valid refresh token
authRouter.post("/refresh", async (context) => {
  const body = await context.req.json();
  const parsed = refreshTokenSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  if (await isTokenRevokedAsync(parsed.data.refresh_token)) {
    return context.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Refresh token sudah dicabut. Silakan login ulang.",
        },
      },
      401,
    );
  }

  try {
    const payload = verifyRefreshToken(parsed.data.refresh_token);

    // Verify user still exists
    const user = await userRepo.findById(payload.userId);
    if (!user) {
      return context.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "User tidak ditemukan",
          },
        },
        401,
      );
    }

    const tokens = generateTokenPair({ userId: user.id, role: user.role });

    return context.json({
      success: true,
      data: {
        token: tokens.token,
        refresh_token: tokens.refreshToken,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          is_verified: user.isVerified,
        },
      },
    });
  } catch {
    return context.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Refresh token tidak valid atau sudah kadaluarsa",
        },
      },
      401,
    );
  }
});

// POST /auth/logout — revoke access token and refresh token
authRouter.post("/logout", authMiddleware, async (context) => {
  const authHeader = context.req.header("Authorization");
  const accessToken = authHeader!.slice(7);

  const body = await context.req.json().catch(() => ({}));
  const parsed = refreshTokenSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const authUser = context.get("user");
  const refreshToken = parsed.data.refresh_token;

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.userId !== authUser.userId) {
      return context.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Akses ditolak",
          },
        },
        403,
      );
    }
  } catch {
    // If the refresh token is already expired or invalid,
    // we still continue to revoke the access token.
  }

  // Mark both as revoked
  revokeToken(accessToken);
  revokeToken(refreshToken);

  return context.json({ success: true, data: { message: "Berhasil logout" } });
});

export { authRouter };
