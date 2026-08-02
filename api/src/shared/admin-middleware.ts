import type { Context, Next } from "hono";
import { verifyToken } from "../modules/auth/jwt";

export async function adminMiddleware(
  context: Context,
  next: Next,
): Promise<Response | void> {
  const header = context.req.header("Authorization");

  if (!header?.startsWith("Bearer ")) {
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

  const token = header.slice(7);

  try {
    const payload = verifyToken(token);
    if (payload.role !== "admin") {
      return context.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Akses ditolak: Hanya admin yang diizinkan",
          },
        },
        403,
      );
    }
    context.set("user", payload);
    await next();
  } catch {
    return context.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Token tidak valid atau sudah kadaluarsa",
        },
      },
      401,
    );
  }
}
