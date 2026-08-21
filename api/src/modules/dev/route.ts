import { Hono } from "hono";
import { env } from "../../config/env";
import { DEV_VIEW_HTML } from "./view";
import { generateTokenPair } from "../auth/jwt";
import { userRepo } from "../users/repository";

const devRouter = new Hono();

devRouter.get("/", (context) => {
  if (env.NODE_ENV === "production") {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      404,
    );
  }
  return context.html(DEV_VIEW_HTML);
});

// GET /dev/admin-token — instantly get an admin JWT for dev panel access
devRouter.get("/admin-token", async (context) => {
  if (env.NODE_ENV === "production") {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      404,
    );
  }

  const adminPhone = "081200000099";
  let admin = await userRepo.findByPhone(adminPhone);

  if (!admin) {
    admin = await userRepo.create({ phone: adminPhone, name: "Admin Dev", role: "admin" });
  } else if (admin.role !== "admin") {
    // Force role to admin for this dev user
    admin = await userRepo.update(admin.id, { name: admin.name });
    // Directly patch the role in-memory (workaround since update doesn't change role)
    admin = { ...admin, role: "admin" };
  }

  const tokens = generateTokenPair({ userId: admin.id, role: "admin" });

  return context.json({
    success: true,
    data: {
      phone: adminPhone,
      name: admin.name,
      role: "admin",
      token: tokens.token,
      refresh_token: tokens.refreshToken,
      instructions: "Paste di browser console: localStorage.setItem('admin_token', '<token>'); location.reload();",
    },
  });
});

export { devRouter };
