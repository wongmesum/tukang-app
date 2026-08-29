import { Hono } from "hono";
import { env } from "../../config/env";
import { runOrderExpiryOnce } from "../orders/expiry";

export const internalJobsRouter = new Hono();

function isAuthorized(request: Request): boolean {
  if (!env.INTERNAL_JOB_SECRET) return env.NODE_ENV !== "production";
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${env.INTERNAL_JOB_SECRET}`;
}

internalJobsRouter.post("/expire-orders", async (context) => {
  if (!isAuthorized(context.req.raw)) {
    return context.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid internal job credentials" } },
      401,
    );
  }

  const result = await runOrderExpiryOnce();
  return context.json({
    success: true,
    data: result,
  });
});
