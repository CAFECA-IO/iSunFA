/*
  Warnings:

  - You are about to drop the column `code` on the `company` table. All the data in the column will be lost.
  - You are about to drop the column `kyc_status` on the `company` table. All the data in the column will be lost.
  - You are about to drop the column `regional` on the `company` table. All the data in the column will be lost.
  - You are about to drop the column `auto_renewal` on the `company_setting` table. All the data in the column will be lost.
  - You are about to drop the column `notify_channel` on the `company_setting` table. All the data in the column will be lost.
  - You are about to drop the column `notify_timing` on the `company_setting` table. All the data in the column will be lost.
  - You are about to drop the column `reminder_freq` on the `company_setting` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `client` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[company_id]` on the table `company_setting` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tax_id` to the `company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `address` to the `company_setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `country` to the `company_setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `company_setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `representative_name` to the `company_setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax_serial_number` to the `company_setting` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "client" DROP CONSTRAINT "client_company_id_fkey";

-- AlterTable company
-- Step 1: Drop the columns 'kyc_status' and 'regional'
ALTER TABLE "company" 
DROP COLUMN "kyc_status",
DROP COLUMN "regional";

-- Step 2: Rename column 'code' to 'tax_id'
ALTER TABLE "company" 
RENAME COLUMN "code" TO "tax_id";

-- Step 3: Add the new column 'tag' with a default value
ALTER TABLE "company" 
ADD COLUMN "tag" TEXT NOT NULL DEFAULT 'all';

-- AlterTable
ALTER TABLE "company_setting" DROP COLUMN "auto_renewal",
DROP COLUMN "notify_channel",
DROP COLUMN "notify_timing",
DROP COLUMN "reminder_freq",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "country" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "representative_name" TEXT NOT NULL,
ADD COLUMN     "tax_serial_number" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "role" ADD COLUMN     "last_login_at" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "full_name",
DROP COLUMN "phone";

-- DropTable
DROP TABLE "client";

-- CreateTable
CREATE TABLE "accounting_setting" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "sales_tax_taxable" BOOLEAN NOT NULL,
    "sales_tax_rate" DOUBLE PRECISION NOT NULL,
    "purchase_tax_taxable" BOOLEAN NOT NULL,
    "purchase_tax_rate" DOUBLE PRECISION NOT NULL,
    "return_periodicity" TEXT NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "accounting_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_vendor" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "customer_vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_bookkeeper" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "birth_date" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "qualification" BOOLEAN NOT NULL,
    "certification_number" TEXT NOT NULL,
    "personal_id_type" TEXT NOT NULL,
    "personal_id_file_id" INTEGER NOT NULL,
    "certification_file_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "kyc_bookkeeper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortcut" (
    "id" SERIAL NOT NULL,
    "accounting_setting_id" INTEGER NOT NULL,
    "action_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "field_list" JSONB NOT NULL,
    "key_list" TEXT[],
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "shortcut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_action_log" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,
    "action_description" TEXT NOT NULL,
    "action_time" INTEGER NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "api_endpoint" TEXT NOT NULL,
    "http_method" TEXT NOT NULL,
    "request_payload" JSONB NOT NULL,
    "http_status_code" INTEGER NOT NULL,
    "status_message" TEXT NOT NULL,

    CONSTRAINT "user_action_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_setting" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "country" TEXT,
    "language" TEXT,
    "phone" TEXT,
    "system_notification" BOOLEAN NOT NULL,
    "update_and_subscription_notification" BOOLEAN NOT NULL,
    "email_notification" BOOLEAN NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kyc_bookkeeper_personal_id_file_id_key" ON "kyc_bookkeeper"("personal_id_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_bookkeeper_certification_file_id_key" ON "kyc_bookkeeper"("certification_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_setting_company_id_key" ON "company_setting"("company_id");

-- AddForeignKey
ALTER TABLE "accounting_setting" ADD CONSTRAINT "accounting_setting_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_vendor" ADD CONSTRAINT "customer_vendor_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_bookkeeper" ADD CONSTRAINT "kyc_bookkeeper_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_bookkeeper" ADD CONSTRAINT "kyc_bookkeeper_personal_id_file_id_fkey" FOREIGN KEY ("personal_id_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_bookkeeper" ADD CONSTRAINT "kyc_bookkeeper_certification_file_id_fkey" FOREIGN KEY ("certification_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortcut" ADD CONSTRAINT "shortcut_accounting_setting_id_fkey" FOREIGN KEY ("accounting_setting_id") REFERENCES "accounting_setting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER SEQUENCE "accounting_setting_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "customer_vendor_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "kyc_bookkeeper_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "news_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "shortcut_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_action_log_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_setting_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_role_id_seq" RESTART WITH 10000000;