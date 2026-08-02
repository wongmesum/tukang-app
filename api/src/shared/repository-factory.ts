// Repository mode detection
// Used by individual module repository.ts files to decide which adapter to export.
// Pattern: each module calls `shouldUsePrisma()` at module init to pick InMemory or Prisma.

import { env } from "../config/env";

export function shouldUsePrisma(): boolean {
  // In test mode, always use in-memory for deterministic isolated tests.
  // In dev/production, use Prisma unless explicitly overridden.
  if (env.NODE_ENV === "test") return false;
  if (process.env.REPOSITORY_MODE === "memory") return false;
  return true;
}
