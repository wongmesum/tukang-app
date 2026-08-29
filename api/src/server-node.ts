import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

import app from "./index";
import { startOrderExpiryJob, stopOrderExpiryJob } from "./modules/orders/expiry";
import { prisma } from "./shared/prisma";
import { env } from "./config/env";

// Passenger/cPanel runs this Node-compatible entrypoint. WebSocket upgrades are
// unavailable on shared hosting; clients can use the REST realtime fallback.
app.use("/uploads/*", serveStatic({ root: "./" }));

const port = Number(process.env.PORT ?? 3000);

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    // eslint-disable-next-line no-console
    console.log(`TukangNDeso API listening on port ${info.port}`);
  },
);

if (env.BACKGROUND_JOBS_ENABLED) {
  startOrderExpiryJob();
}

const shutdown = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`[${signal}] Shutting down gracefully...`);
  stopOrderExpiryJob();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
