import { PrismaPg } from "@prisma/adapter-pg";
import PrismaClientPackage, { type PrismaClient as PrismaClientType } from "@prisma/client";
import { env } from "../config/env";

const { PrismaClient } = PrismaClientPackage;

// Reuse a single Prisma instance across hot-reloads in development.
// Prisma is generated with engineType="client", so database access goes
// through the pure-JS PostgreSQL driver adapter instead of the Rust engine.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClientType | undefined;
}

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
