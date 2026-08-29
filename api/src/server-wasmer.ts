import { serve } from "@hono/node-server";

import app from "./index";
import { env } from "./config/env";
import { prisma } from "./shared/prisma";

if (env.DEPLOYMENT_TARGET !== "wasmer") {
  throw new Error("The Wasmer entrypoint requires DEPLOYMENT_TARGET=wasmer");
}
if (env.BACKGROUND_JOBS_ENABLED) {
  throw new Error("Wasmer must run with BACKGROUND_JOBS_ENABLED=false");
}
if (env.NODE_ENV === "production" && env.UPLOAD_STORAGE !== "r2") {
  throw new Error("Wasmer production requires UPLOAD_STORAGE=r2");
}
if (env.NODE_ENV === "production" && env.REDIS_DRIVER !== "rest") {
  throw new Error("Wasmer production requires REDIS_DRIVER=rest");
}

const port = Number(process.env.PORT ?? 8080);
const hostname = "0.0.0.0";

const server = serve(
  {
    fetch: app.fetch,
    hostname,
    port,
  },
  (info) => {
    // eslint-disable-next-line no-console
    console.log(`TukangNDeso Wasmer API listening on http://${hostname}:${info.port}`);
  },
);

const shutdown = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`[${signal}] Shutting down Wasmer API...`);
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
