import type { Context, Next } from "hono";
import type { AuthUser } from "./auth-middleware";

export function requireRole(...roles: AuthUser["role"][]) {
  return async function roleGuard(context: Context, next: Next): Promise<Response | void> {
    const user = context.get("user") as AuthUser | undefined;

    if (!user) {
      return context.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Token tidak ditemukan atau request belum diautentikasi",
          },
        },
        401,
      );
    }

    if (!roles.includes(user.role)) {
      return context.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Akses ditolak: Dibutuhkan peran [${roles.join(", ")}]`,
          },
        },
        403,
      );
    }

    await next();
  };
}