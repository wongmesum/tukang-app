-- Order accept-timeout tracking + dispute records.
-- Safe to run on databases already initialized with 001_init.sql and
-- 002_phase3_production_fields.sql.

-- --------------------------------------------------------------------
-- 1. Track when an order was assigned to a worker.
--    The timeout sweeper needs this to know how long a MATCHED order has
--    been waiting for the worker to accept.
-- --------------------------------------------------------------------
ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "matched_at" TIMESTAMP(3);

-- Backfill: existing orders that are already past the matching stage get
-- created_at as an approximation so the sweeper doesn't treat them as
-- infinitely stale and expire them all on first run.
UPDATE "orders"
SET "matched_at" = "created_at"
WHERE "matched_at" IS NULL
  AND "status" NOT IN ('PENDING', 'EXPIRED', 'CANCELLED_BY_CUSTOMER');

-- The sweeper queries by status and orders by matched_at.
CREATE INDEX IF NOT EXISTS "idx_orders_matched_at"
ON "orders" ("status", "matched_at");

-- --------------------------------------------------------------------
-- 2. Disputes filed by customers or workers.
--    Previously admin could resolve a dispute but there was nowhere to
--    store *why* it was filed, so admin had no context to act on.
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeFiledBy') THEN
    CREATE TYPE "DisputeFiledBy" AS ENUM ('customer', 'worker');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeStatus') THEN
    CREATE TYPE "DisputeStatus" AS ENUM ('open', 'resolved');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "disputes" (
  "id"             TEXT PRIMARY KEY,
  "order_id"       TEXT NOT NULL,
  "filed_by_id"    TEXT NOT NULL,
  "filed_by_role"  "DisputeFiledBy" NOT NULL,
  "reason"         TEXT NOT NULL,
  "photos"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"         "DisputeStatus" NOT NULL DEFAULT 'open',
  "resolution"     TEXT,
  "refunded"       BOOLEAN NOT NULL DEFAULT false,
  "resolved_at"    TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "disputes_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
  CONSTRAINT "disputes_filed_by_id_fkey"
    FOREIGN KEY ("filed_by_id") REFERENCES "users"("id")
);

-- One open dispute per order — refiling should update, not duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_disputes_order_open"
ON "disputes" ("order_id")
WHERE "status" = 'open';

CREATE INDEX IF NOT EXISTS "idx_disputes_status_created"
ON "disputes" ("status", "created_at" DESC);
