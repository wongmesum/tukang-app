-- Cancellation fees + customer/worker chat.
-- Safe to run after 001_init.sql, 002_phase3_production_fields.sql and
-- 003_order_timeouts_and_disputes.sql.

-- --------------------------------------------------------------------
-- 1. Cancellation fee charged when a customer cancels after departure.
--    Stored on the pricing row so the customer can see what they were
--    charged and so reports can account for it.
-- --------------------------------------------------------------------
ALTER TABLE "order_pricing"
ADD COLUMN IF NOT EXISTS "cancellation_fee" INTEGER;

-- --------------------------------------------------------------------
-- 2. Chat messages between the customer and the assigned worker.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "messages" (
  "id"         TEXT PRIMARY KEY,
  "order_id"   TEXT NOT NULL,
  "sender_id"  TEXT NOT NULL,
  "content"    TEXT NOT NULL,
  "read_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "messages_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
  CONSTRAINT "messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id")
);

-- Chat history is always read newest-last for one order.
CREATE INDEX IF NOT EXISTS "idx_messages_order_created"
ON "messages" ("order_id", "created_at");

-- Unread badge counts filter by recipient, so index the unread rows.
CREATE INDEX IF NOT EXISTS "idx_messages_unread"
ON "messages" ("order_id", "sender_id")
WHERE "read_at" IS NULL;
