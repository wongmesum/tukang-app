import app from "./index";
import { serveStatic } from "hono/bun";
import { wsHandler, authenticateUpgrade } from "./modules/realtime/ws-handler";
import { startOrderExpiryJob, stopOrderExpiryJob } from "./modules/orders/expiry";
import { prisma } from "./shared/prisma";

// Static file serving for uploads
app.use("/uploads/*", serveStatic({ root: "./" }));

const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port,
  async fetch(req, server) {
    // Handle WebSocket upgrade
    const url = new URL(req.url);
    if (url.pathname === "/v1/realtime") {
      const wsData = await authenticateUpgrade(url);
      if (!wsData) {
        return new Response("Unauthorized", { status: 401 });
      }
      const upgraded = server.upgrade(req, { data: wsData });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    // Regular HTTP requests handled by Hono
    return app.fetch(req);
  },
  websocket: wsHandler,
});

// eslint-disable-next-line no-console
console.log(`API running on http://localhost:${port}`);
// eslint-disable-next-line no-console
console.log(`WebSocket available at ws://localhost:${port}/v1/realtime?token=<jwt>`);

// Start background jobs
startOrderExpiryJob();

// Graceful shutdown
const shutdown = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`\n[${signal}] Shutting down gracefully...`);
  stopOrderExpiryJob();
  server.stop();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
