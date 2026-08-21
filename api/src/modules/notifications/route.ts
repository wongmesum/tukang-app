import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../../shared/auth-middleware";

const notificationsRouter = new Hono();
notificationsRouter.use("/notifications/*", authMiddleware);

// In-memory device token store (replace with DB in production)
const deviceTokens = new Map<string, { token: string; platform: string }[]>();

const registerTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["android", "ios"]),
});

// POST /notifications/register-device — register FCM device token
notificationsRouter.post("/notifications/register-device", async (context) => {
  const authUser = context.get("user");
  const body = await context.req.json();
  const parsed = registerTokenSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Input tidak valid" },
      },
      400,
    );
  }

  const { token, platform } = parsed.data;
  const existing = deviceTokens.get(authUser.userId) ?? [];

  // Avoid duplicates
  if (!existing.some((d) => d.token === token)) {
    existing.push({ token, platform });
    deviceTokens.set(authUser.userId, existing);
  }

  return context.json({
    success: true,
    data: { registered: true },
  });
});

// DELETE /notifications/unregister-device — remove FCM device token
notificationsRouter.post("/notifications/unregister-device", async (context) => {
  const authUser = context.get("user");
  const body = await context.req.json() as { token?: string };

  if (!body.token) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Token wajib diisi" } },
      400,
    );
  }

  const existing = deviceTokens.get(authUser.userId) ?? [];
  const filtered = existing.filter((d) => d.token !== body.token);
  deviceTokens.set(authUser.userId, filtered);

  return context.json({
    success: true,
    data: { unregistered: true },
  });
});

export { notificationsRouter };
