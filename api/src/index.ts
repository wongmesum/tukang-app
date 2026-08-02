import { Hono } from "hono";
import { env } from "./config/env";
import { errorHandler } from "./shared/error-handler";
import { corsMiddleware } from "./shared/cors";
import { requestLogger } from "./shared/logger";
import { generalLimiter } from "./shared/rate-limit";
import { prisma } from "./shared/prisma";
import { pricingRouter } from "./modules/pricing/route";
import { authRouter } from "./modules/auth/route";
import { usersRouter } from "./modules/users/route";
import { servicesRouter } from "./modules/services/route";
import { ordersRouter } from "./modules/orders/route";
import { paymentsRouter } from "./modules/payments/route";
import { reviewsRouter } from "./modules/reviews/route";
import { workersRouter } from "./modules/workers/route";
import { matchingRouter } from "./modules/matching/route";
import { adminRouter } from "./modules/admin/route";
import { devRouter } from "./modules/dev/route";
import { seedRouter } from "./modules/dev/seed";

const app = new Hono();

// Global middleware
app.onError(errorHandler);
app.use("*", corsMiddleware);
app.use("*", requestLogger);
if (env.NODE_ENV !== "test") {
  app.use("*", generalLimiter);
}

app.get("/health", async (context) => {
  let dbStatus = "unknown";

  if (env.NODE_ENV !== "test") {
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
      ]);
      dbStatus = "connected";
    } catch {
      dbStatus = "disconnected";
      return context.json(
        {
          success: false,
          error: { code: "SERVICE_UNAVAILABLE", message: "Database tidak dapat diakses" },
        },
        503,
      );
    }
  } else {
    dbStatus = "test-mocked";
  }

  return context.json({
    success: true,
    data: {
      service: "tukangndeso-api",
      status: "ok",
      db_status: dbStatus,
    },
  });
});

// Mount routes
app.route("/v1/pricing", pricingRouter);
app.route("/v1/auth", authRouter);
app.route("/v1", usersRouter);
app.route("/v1", servicesRouter);
app.route("/v1", ordersRouter);
app.route("/v1", paymentsRouter);
app.route("/v1", reviewsRouter);
app.route("/v1", workersRouter);
app.route("/v1", matchingRouter);
app.route("/v1/admin", adminRouter);
app.route("/dev", devRouter);
app.route("/dev/seed", seedRouter);

export default app;

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  const server = Bun.serve({
    port,
    fetch: app.fetch,
  });

  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n[${signal}] Shutting down gracefully...`);
    server.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
