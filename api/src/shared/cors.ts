import type { Context, Next } from "hono";
import { env } from "../config/env";

function getAllowedOrigins(): string[] {
  return env.CORS_ORIGINS
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export async function corsMiddleware(context: Context, next: Next): Promise<Response | void> {
  const origin = context.req.header("Origin");
  const allowedOrigins = getAllowedOrigins();
  const allowAll = allowedOrigins.includes("*") && process.env.NODE_ENV !== "production";
  const isAllowed = origin && (allowAll || allowedOrigins.includes(origin));

  if (isAllowed) {
    context.header("Access-Control-Allow-Origin", origin);
    context.header("Vary", "Origin");
  }

  context.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  context.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  context.header("Access-Control-Max-Age", "86400");

  if (context.req.method === "OPTIONS") {
    return context.body(null, 204);
  }

  await next();
}
