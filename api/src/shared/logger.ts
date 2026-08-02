import type { Context, Next } from "hono";

export async function requestLogger(context: Context, next: Next): Promise<void> {
  const start = Date.now();
  const method = context.req.method;
  const path = context.req.path;

  await next();

  const duration = Date.now() - start;
  const status = context.res.status;

  if (process.env.NODE_ENV !== "test") {
    // In production, we'd want this as a structured JSON log string
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        level: "info",
        type: "access",
        method,
        path,
        status,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      })
    );
  }
}