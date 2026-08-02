import type { Context, Next } from "hono";
import { verifyToken } from "../modules/auth/jwt";

export interface AuthUser {
  userId: string;
  role: string;
}

// Extend Hono's context variables
declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export async function authMiddleware(context: Context, next: Next): Promise<Response | void> {
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
