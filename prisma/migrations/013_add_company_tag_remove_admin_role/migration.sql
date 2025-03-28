/*
  Warnings:

  - You are about to drop the column `role_id` on the `user_role` table. All the data in the column will be lost.
  - You are about to drop the `admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `team_id` on table `company` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `role_name` to the `user_role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `user_role` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: 建立 enum
CREATE TYPE "Tag" AS ENUM ('ALL', 'FINANCIAL', 'TAX');
CREATE TYPE "RoleName" AS ENUM ('ACCOUNTANT', 'BOOKKEEPER', 'EDUCATIONAL_TRIAL_VERSION', 'ENTERPRISE', 'TEST');
CREATE TYPE "RoleType" AS ENUM ('SYSTEM', 'COMPANY', 'USER');

-- Step 2: 新增 company.user_id、company.tag，但先不設為 NOT NULL
ALTER TABLE "company" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "company" ADD COLUMN "tag" "Tag";

-- Step 3: 新增 user_role.role_name、user_role.type 欄位，但先不設為 NOT NULL
ALTER TABLE "user_role" ADD COLUMN "role_name" "RoleName";
ALTER TABLE "user_role" ADD COLUMN "type" "RoleType";

-- Step 4: 新增 role_feature 表（不受依賴，先建）
CREATE TABLE "role_feature" (
    "id" SERIAL NOT NULL,
    "role_name" "RoleName" NOT NULL,
    "feature_key" TEXT NOT NULL,
    "feature_value" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    CONSTRAINT "role_feature_pkey" PRIMARY KEY ("id")
);

-- Step 5: 搬移 admin → company 的 user_id + tag
UPDATE "company" c
SET
  "user_id" = a."user_id",
  "tag" = a."tag"::"Tag"
FROM "admin" a
WHERE a."company_id" = c."id" AND a."tag" = 'owner';

UPDATE "company" SET "user_id" = 555 WHERE "user_id" IS NULL;
UPDATE "company" SET "tag" = 'ALL' WHERE "tag" IS NULL;

-- Step 6: 設定 user_id、tag 為 NOT NULL，並補上 default
ALTER TABLE "company"
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "tag" SET DEFAULT 'ALL',
ALTER COLUMN "tag" SET NOT NULL;

-- Step 7: 透過 user_role.role_id → role.id 建立關聯，然後將 role.name / role.type 搬到 user_role 的新欄位
UPDATE "user_role" ur
SET 
  "role_name" = r."name"::"RoleName",
  "type" = r."type"::"RoleType"
FROM "role" r
WHERE r."id" = ur."role_id";

UPDATE "user_role" SET "role_name" = 'EDUCATIONAL_TRIAL_VERSION'::"RoleName" WHERE "role_name" IS NULL;
UPDATE "user_role" SET "type" = 'USER'::"RoleType" WHERE "type" IS NULL;

-- Step 8: 移除 user_role.role_id，並強制新欄位為 NOT NULL（這步放後面避免失敗）
DO $$ BEGIN
  BEGIN
    ALTER TABLE "user_role" DROP CONSTRAINT "user_role_role_id_fkey";
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK user_role_role_id_fkey 不存在，跳過';
  END;
END $$;

ALTER TABLE "user_role" DROP COLUMN IF EXISTS "role_id";

ALTER TABLE "user_role"
  ALTER COLUMN "role_name" SET NOT NULL,
  ALTER COLUMN "type" SET NOT NULL;


-- Step 9: Drop 外鍵（會被 drop 的表）
DO $$ BEGIN
  BEGIN
    ALTER TABLE "admin" DROP CONSTRAINT IF EXISTS "admin_company_id_fkey";
    ALTER TABLE "admin" DROP CONSTRAINT IF EXISTS "admin_user_id_fkey";
    ALTER TABLE "admin" DROP CONSTRAINT IF EXISTS "admin_role_id_fkey";
    ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "invitation_company_id_fkey";
    ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "invitation_created_user_id_fkey";
    ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "invitation_role_id_fkey";
    ALTER TABLE "kyc_role" DROP CONSTRAINT IF EXISTS "kyc_role_role_id_fkey";
  END;
END $$;

-- Step 10: 備份後 Drop 表
CREATE TABLE IF NOT EXISTS "admin_backup" AS TABLE "admin";
CREATE TABLE IF NOT EXISTS "role_backup" AS TABLE "role";
CREATE TABLE IF NOT EXISTS "invitation_backup" AS TABLE "invitation";

DROP TABLE IF EXISTS "admin";
DROP TABLE IF EXISTS "role";
DROP TABLE IF EXISTS "invitation";

-- Step 11: company FK（補 team_id 為 not null，並掛 FK）
ALTER TABLE "company"
  ALTER COLUMN "team_id" SET NOT NULL;

DO $$ BEGIN
  BEGIN
    ALTER TABLE "company" ADD CONSTRAINT "company_team_id_fkey" 
      FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'FK company_team_id_fkey 已存在，跳過';
  END;

  BEGIN
    ALTER TABLE "company" ADD CONSTRAINT "company_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'FK company_user_id_fkey 已存在，跳過';
  END;
END $$;

-- Step 12: 其他欄位 default 修正（不影響主要邏輯）
ALTER TABLE "accountBook_transfer"
ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

ALTER TABLE "invite_team_member"
ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

ALTER TABLE "order" ALTER COLUMN "user_id" DROP DEFAULT;

ALTER TABLE "team"
ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

ALTER TABLE "team_invoice" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

ALTER TABLE "team_payment_transaction" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

ALTER TABLE "team_subscription"
ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;
