-- Phase 3 production persistence fields.
-- Safe to run on databases initialized with prisma/001_init.sql.

ALTER TABLE "worker_profiles"
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "payments"
ADD COLUMN IF NOT EXISTS "qr_string" TEXT,
ADD COLUMN IF NOT EXISTS "qr_image_url" TEXT,
ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
