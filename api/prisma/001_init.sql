-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'worker', 'admin');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('pending', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "PricingScheme" AS ENUM ('hourly', 'daily');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('qris', 'cash');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('credit', 'debit');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "full_address" TEXT NOT NULL,
    "location" geography(Point, 4326) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ktp_number" VARCHAR(16) NOT NULL,
    "ktp_photo_url" TEXT NOT NULL,
    "bio" TEXT,
    "work_radius_km" INTEGER NOT NULL DEFAULT 20,
    "home_location" geography(Point, 4326) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "rating_avg" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "verified_at" TIMESTAMP(3),
    "status" "WorkerStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_skills" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "category_code" VARCHAR(10) NOT NULL,
    "experience_years" INTEGER,

    CONSTRAINT "worker_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "icon_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "category_code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "base_hourly_rate" INTEGER NOT NULL DEFAULT 30000,
    "base_daily_rate" INTEGER NOT NULL DEFAULT 150000,
    "min_hours" INTEGER NOT NULL DEFAULT 2,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" VARCHAR(20) NOT NULL,
    "customer_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "service_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "pricing_scheme" "PricingScheme" NOT NULL,
    "estimated_duration" INTEGER NOT NULL,
    "description" TEXT,
    "photos" TEXT[],
    "address_id" TEXT NOT NULL,
    "customer_location" geography(Point, 4326) NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_pricing" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "base_rate" INTEGER NOT NULL,
    "distance_km" DECIMAL(5,1) NOT NULL,
    "travel_cost" INTEGER NOT NULL,
    "surcharge_holiday" INTEGER NOT NULL DEFAULT 0,
    "surcharge_night" INTEGER NOT NULL DEFAULT 0,
    "surcharge_weekend" INTEGER NOT NULL DEFAULT 0,
    "surcharge_urgent" INTEGER NOT NULL DEFAULT 0,
    "surcharge_floor" INTEGER NOT NULL DEFAULT 0,
    "total_estimate" INTEGER NOT NULL,
    "total_final" INTEGER,
    "actual_duration" DECIMAL(4,1),

    CONSTRAINT "order_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "reference" VARCHAR(100),
    "qr_string" TEXT,
    "qr_image_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "photos" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_wallets" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "total_earned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "worker_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "reference_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "worker_profiles_user_id_key" ON "worker_profiles"("user_id");

-- CreateIndex
CREATE INDEX "worker_skills_category_code_worker_id_idx" ON "worker_skills"("category_code", "worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_worker_id_status_idx" ON "orders"("worker_id", "status");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_pricing_order_id_key" ON "order_pricing"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_order_id_key" ON "reviews"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "worker_wallets_worker_id_key" ON "worker_wallets"("worker_id");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_skills" ADD CONSTRAINT "worker_skills_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "worker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_skills" ADD CONSTRAINT "worker_skills_category_code_fkey" FOREIGN KEY ("category_code") REFERENCES "service_categories"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_code_fkey" FOREIGN KEY ("category_code") REFERENCES "service_categories"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_pricing" ADD CONSTRAINT "order_pricing_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "worker_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

