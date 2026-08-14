import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../../shared/auth-middleware";
import { deviceTokenRepo } from "./repository";

const registerTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["android", "ios"]),
});

const unregisterTokenSchema = z.object({
  token: z.string().min(10),
});

const notificationsRouter = new Hono();

// POST /notifications/register — register device token for push
notificationsRouter.post("/register", authMiddleware, async (context) => {
  const body = await context.req.json();
  const parsed = registerTokenSchema.safeParse(body);

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
  const device = await deviceTokenRepo.register(
    authUser.userId,
    parsed.data.token,
    parsed.data.platform,
  );

  return context.json({
    success: true,
    data: {
      id: device.id,
      platform: device.platform,
      registered_at: device.createdAt.toISOString(),
    },
  });
});

// POST /notifications/unregister — remove device token
notificationsRouter.post("/unregister", authMiddleware, async (context) => {
  const body = await context.req.json();
  const parsed = unregisterTokenSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Token wajib diisi",
        },
      },
      400,
    );
  }

  const authUser = context.get("user");
  await deviceTokenRepo.unregister(authUser.userId, parsed.data.token);

  return context.json({
    success: true,
    data: { message: "Device token dihapus" },
  });
});

export { notificationsRouter };
