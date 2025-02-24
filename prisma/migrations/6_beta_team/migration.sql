CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "TeamPlanType" AS ENUM ('BEGINNER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "TeamPaymentStatus" AS ENUM ('PAID', 'UNPAID', 'FREE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "team_id" INTEGER;

-- CreateTable
CREATE TABLE "team_plan" (
    "id" SERIAL NOT NULL,
    "type" "TeamPlanType" NOT NULL,
    "plan_name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "extra_member_price" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "team_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_plan_feature" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "feature_key" TEXT NOT NULL,
    "feature_value" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "team_plan_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "about" TEXT NOT NULL DEFAULT '',
    "profile" JSONB NOT NULL,
    "bank_number" TEXT NOT NULL DEFAULT '',
    "created_at" INTEGER NOT NULL,

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "TeamRole" NOT NULL,
    "joined_at" INTEGER NOT NULL,

    CONSTRAINT "team_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_subscription" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "auto_renewal" BOOLEAN NOT NULL DEFAULT false,
    "start_date" INTEGER NOT NULL,
    "expired_date" INTEGER NOT NULL,
    "payment_status" "TeamPaymentStatus" NOT NULL,
    "last_transaction_id" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "team_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_payment_transaction" (
    "id" SERIAL NOT NULL,
    "subscription_id" INTEGER NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "created_at" INTEGER NOT NULL,

    CONSTRAINT "team_payment_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invoice" (
    "id" SERIAL NOT NULL,
    "subscription_id" INTEGER NOT NULL,
    "issued_timestamp" INTEGER NOT NULL,
    "due_timestamp" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "plan_start_date" INTEGER NOT NULL,
    "plan_end_date" INTEGER NOT NULL,
    "plan_quantity" INTEGER NOT NULL,
    "plan_unit_price" INTEGER NOT NULL,
    "plan_amount" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "amount_due" INTEGER NOT NULL,
    "payer_name" TEXT NOT NULL,
    "payer_address" TEXT NOT NULL,
    "payer_phone" TEXT NOT NULL,
    "payer_tax_id" TEXT NOT NULL,
    "payee_name" TEXT NOT NULL,
    "payee_address" TEXT NOT NULL,
    "payee_phone" TEXT NOT NULL,
    "payee_tax_id" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,

    CONSTRAINT "team_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_plan_type_key" ON "team_plan"("type");

-- CreateIndex
CREATE UNIQUE INDEX "team_uuid_key" ON "team"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_team_id_user_id_key" ON "team_member"("team_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_subscription_team_id_key" ON "team_subscription"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_payment_transaction_subscription_id_key" ON "team_payment_transaction"("subscription_id");

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_plan_feature" ADD CONSTRAINT "team_plan_feature_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "team_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_subscription" ADD CONSTRAINT "team_subscription_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_subscription" ADD CONSTRAINT "team_subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "team_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment_transaction" ADD CONSTRAINT "team_payment_transaction_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "team_subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invoice" ADD CONSTRAINT "team_invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "team_subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invoice" ADD CONSTRAINT "team_invoice_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "team_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 🔹 1️⃣ 新增 `TeamPlan`
INSERT INTO team_plan (type, plan_name, price, extra_member_price, created_at, updated_at) VALUES
  ('BEGINNER', 'Beginner', 0, NULL, EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ('PROFESSIONAL', 'Professional', 899, 89, EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ('ENTERPRISE', 'Enterprise', 8990, NULL, EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT);

-- 🔹 2️⃣ 新增 `TeamPlanFeature`
INSERT INTO team_plan_feature (plan_id, feature_key, feature_value, created_at, updated_at)
VALUES
  -- 🔹 Beginner 計畫
  ((SELECT id FROM team_plan WHERE type = 'BEGINNER'), 'CLOUD_STORAGE', '10GB', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'BEGINNER'), 'AI_ASSISTANT', 'LIMITED', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'BEGINNER'), 'REPORT_GENERATION', 'UNLIMITED', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'BEGINNER'), 'FINANCIAL_STATEMENTS', 'MANUAL_DOWNLOAD', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'BEGINNER'), 'MATCHMAKING_PLATFORM', 'TASK_ACCEPTANCE_ONLY', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'BEGINNER'), 'TEAM_MEMBERS', 'LIMITED_TO_1_PERSON', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'BEGINNER'), 'CUSTOMER_SUPPORT', 'LIVE_CHAT_SUPPORT', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),

  -- 🔹 Professional 計畫
  ((SELECT id FROM team_plan WHERE type = 'PROFESSIONAL'), 'CLOUD_STORAGE', '1TB', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'PROFESSIONAL'), 'AI_ASSISTANT', 'UNLIMITED_CAPACITY', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'PROFESSIONAL'), 'MATCHMAKING_PLATFORM', 'POST_TASK_REQUIREMENTS', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'PROFESSIONAL'), 'TEAM_MEMBERS', 'UP_TO_10_PEOPLE', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'PROFESSIONAL'), 'FINANCIAL_STATEMENTS', 'AUTO_UPDATED', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'PROFESSIONAL'), 'TECHNICAL_SUPPORT', 'UP_TO_24_HOURS_IN_TOTAL_4_HOURS_PER_SESSION', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'PROFESSIONAL'), 'ADDITIONAL_PERKS', '10_ASSET_TAGGING_STICKERS', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),

  -- 🔹 Enterprise 計畫
  ((SELECT id FROM team_plan WHERE type = 'ENTERPRISE'), 'CLOUD_STORAGE', 'UNLIMITED', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'ENTERPRISE'), 'REPORT_GENERATION', 'CUSTOMIZABLE_REPORTS', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'ENTERPRISE'), 'MATCHMAKING_PLATFORM', 'PRIORITY_VISIBILITY', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'ENTERPRISE'), 'TEAM_MEMBERS', 'UNLIMITED', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'ENTERPRISE'), 'FINANCIAL_STATEMENTS', 'AUTO_UPDATED', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'ENTERPRISE'), 'API_INTEGRATION', 'SYSTEM_SUPPORT', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'ENTERPRISE'), 'TECHNICAL_SUPPORT', 'UP_TO_48_HOURS_IN_TOTAL_4_HOURS_PER_SESSION', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'ENTERPRISE'), 'ADDITIONAL_PERKS', '100_ASSET_TAGGING_STICKERS', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'ENTERPRISE'), 'ADDITIONAL_PERKS', 'ONLINE_AND_OFFLINE_INTEGRATION', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT),
  ((SELECT id FROM team_plan WHERE type = 'ENTERPRISE'), 'ADDITIONAL_PERKS', 'HARDWARE_SUPPORT', EXTRACT(EPOCH FROM NOW())::INT, EXTRACT(EPOCH FROM NOW())::INT);

-- 🔹 1️⃣ 建立 `Team` 並設 `User` 為 `OWNER`
INSERT INTO team (uuid, owner_id, name, about, profile, bank_number, created_at)
SELECT uuid_generate_v4(), id, name || '''s Team', '', '{}', '', EXTRACT(EPOCH FROM NOW())::INT
FROM "user";

-- 🔹 2️⃣ 在 `TeamMember` 中新增 `OWNER`
INSERT INTO team_member (team_id, user_id, role, joined_at)
SELECT t.id, t.owner_id, 'OWNER', t.created_at
FROM team t;

-- 🔹 3️⃣ 更新 `Company` 的 `team_id`（關聯 `User` 的所有 `Company`）
UPDATE company c
SET team_id = (
    SELECT t.id FROM team t
    JOIN admin a ON a.company_id = c.id  -- 根據 admin 來找出 company 對應的 user
    WHERE t.owner_id = a.user_id
    LIMIT 1
)
WHERE c.team_id IS NULL;

-- 🔹 4️⃣ 新增 `TeamSubscription` (`Beginner` 訂閱)
INSERT INTO team_subscription (team_id, plan_id, auto_renewal, start_date, expired_date, payment_status, created_at, updated_at)
SELECT t.id, (SELECT id FROM team_plan WHERE type = 'BEGINNER'), FALSE,
       EXTRACT(EPOCH FROM NOW())::INT, 
       EXTRACT(EPOCH FROM (NOW() + INTERVAL '1 month'))::INT,  -- ✅ 訂閱 1 個月後到期
       'FREE', 
       EXTRACT(EPOCH FROM NOW())::INT, 
       EXTRACT(EPOCH FROM NOW())::INT
FROM team t;
