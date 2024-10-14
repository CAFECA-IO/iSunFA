/*
  Warnings:

  - You are about to drop the column `contract_id` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `end_date` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `estimate_useful_life` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `project_id` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `supplier` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `voucher_id` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `invoice` table. All the data in the column will be lost.
  - You are about to drop the column `event_type` on the `invoice` table. All the data in the column will be lost.
  - You are about to drop the column `image_file_id` on the `invoice` table. All the data in the column will be lost.
  - You are about to drop the column `journal_id` on the `invoice` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `invoice` table. All the data in the column will be lost.
  - You are about to drop the column `payment_id` on the `invoice` table. All the data in the column will be lost.
  - You are about to drop the column `payment_reason` on the `invoice` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_or_supplier` on the `invoice` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_tax_id` on the `invoice` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `payment_record` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `payment_record` table. All the data in the column will be lost.
  - You are about to drop the column `annual_fee` on the `plan` table. All the data in the column will be lost.
  - You are about to drop the column `monthly_fee` on the `plan` table. All the data in the column will be lost.
  - You are about to drop the column `journal_id` on the `voucher` table. All the data in the column will be lost.
  - You are about to drop the `customer_vendor` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `accumulated_depreciation` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `acquisition_date` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `asset_name` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `asset_number` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `asset_status` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `asset_type` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency_alias` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `depreciation_start` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `note` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchase_price` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remaining_life` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `useful_life` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `residual_value` on the `asset` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `certificate_id` to the `invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `no` to the `invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price_before_tax` to the `invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax_price` to the `invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax_ratio` to the `invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax_type` to the `invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_price` to the `invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `action` to the `payment_record` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fee` to the `payment_record` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_created_at` to the `payment_record` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refund_amount` to the `payment_record` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billing_cycle` to the `plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `auto_renewal` to the `subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `voucher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `voucher` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "asset" DROP CONSTRAINT "asset_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "asset" DROP CONSTRAINT "asset_project_id_fkey";

-- DropForeignKey
ALTER TABLE "asset" DROP CONSTRAINT "asset_voucher_id_fkey";

-- DropForeignKey
ALTER TABLE "customer_vendor" DROP CONSTRAINT "customer_vendor_company_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice" DROP CONSTRAINT "invoice_image_file_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice" DROP CONSTRAINT "invoice_journal_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice" DROP CONSTRAINT "invoice_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "voucher" DROP CONSTRAINT "voucher_journal_id_fkey";

-- DropIndex
DROP INDEX "invoice_image_file_id_key";

-- DropIndex
DROP INDEX "invoice_journal_id_key";

-- DropIndex
DROP INDEX "invoice_number_key";

-- DropIndex
DROP INDEX "invoice_payment_id_key";

-- DropIndex
DROP INDEX "voucher_journal_id_key";

-- AlterTable
ALTER TABLE "asset" DROP COLUMN "contract_id",
DROP COLUMN "description",
DROP COLUMN "end_date",
DROP COLUMN "estimate_useful_life",
DROP COLUMN "label",
DROP COLUMN "price",
DROP COLUMN "project_id",
DROP COLUMN "start_date",
DROP COLUMN "supplier",
DROP COLUMN "voucher_id",
DROP COLUMN "residual_value",
ADD COLUMN  "residual_value" DOUBLE PRECISION NOT NULL,
ADD COLUMN "company_id" INTEGER NOT NULL,
ADD COLUMN  "number" TEXT NOT NULL,
ADD COLUMN  "acquisition_date" INTEGER NOT NULL,
ADD COLUMN  "purchase_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN  "accumulated_depreciation" DOUBLE PRECISION NOT NULL,
ADD COLUMN  "remaining_life" INTEGER NOT NULL,
ADD COLUMN  "status" TEXT NOT NULL,
ADD COLUMN  "depreciation_start" INTEGER NOT NULL,
ADD COLUMN  "useful_life" INTEGER NOT NULL,
ADD COLUMN  "note" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payment_record" DROP COLUMN "date",
DROP COLUMN "description",
ADD COLUMN     "action" TEXT NOT NULL DEFAULT 'payment',
ADD COLUMN     "auth_code" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "card_issuer_country" TEXT NOT NULL DEFAULT 'Taiwan',
ADD COLUMN     "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "payment_created_at" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "refund_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

ALTER TABLE "payment_record"
ALTER COLUMN "action" DROP DEFAULT,
ALTER COLUMN "auth_code" DROP DEFAULT,
ALTER COLUMN "card_issuer_country" DROP DEFAULT,
ALTER COLUMN "fee" DROP DEFAULT,
ALTER COLUMN "payment_created_at" DROP DEFAULT,
ALTER COLUMN "refund_amount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "plan" DROP COLUMN "annual_fee",
DROP COLUMN "monthly_fee",
ADD COLUMN     "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 10;

ALTER TABLE "plan"
ALTER COLUMN "billing_cycle" DROP DEFAULT,
ALTER COLUMN "price" DROP DEFAULT;

-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "auto_renewal" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "subscription" 
ALTER COLUMN "auto_renewal" DROP DEFAULT;

-- DropTable
DROP TABLE "customer_vendor";

-- CreateTable
CREATE TABLE "asset_voucher" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "asset_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associate_voucher" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "original_voucher_id" INTEGER NOT NULL,
    "result_voucher_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "associate_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparty" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "counterparty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "file_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" SERIAL NOT NULL,
    "event_type" TEXT NOT NULL,
    "frequence" TEXT NOT NULL,
    "start_date" INTEGER NOT NULL,
    "end_date" INTEGER NOT NULL,
    "daysOfWeek" INTEGER[],
    "monthsOfYear" TEXT[],
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "file"
RENAME COLUMN "encryptedSymmetricKey" to "encrypted_symmetric_key";

-- CreateTable
CREATE TABLE "invoice_voucher_journal" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER,
    "voucher_id" INTEGER,
    "journal_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "payment_id" INTEGER,
    "payment_reason" TEXT NOT NULL,
    "vendor_or_supplier" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "invoice_voucher_journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_payment_info" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_payment_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_certificate" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "certificate_id" INTEGER NOT NULL,
    "is_read" BOOLEAN NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_voucher" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "is_read" BOOLEAN NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_certificate" (
    "id" SERIAL NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "certificate_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "voucher_certificate_pkey" PRIMARY KEY ("id")
);

-- Insert a default file for cases where file_id is NULL
INSERT INTO file (id, name, size, mime_type, type, url, is_encrypted, encrypted_symmetric_key, iv, created_at, updated_at)
SELECT 555 AS id, 'N/A' AS name, 0 AS size, 'N/A' AS mime_type, 'N/A' AS type, 'N/A' AS url, FALSE AS is_encrypted, 'N/A' AS encrypted_symmetric_key, '' AS iv, 0 AS created_at, 0 AS updated_at
WHERE NOT EXISTS (SELECT 1 FROM file WHERE id = 555);

-- Insert a default company for cases where company_id is NULL
INSERT INTO company (id, tax_id, image_file_id, start_date, tag, name, created_at, updated_at)
SELECT 555 AS id, 555 AS tax_id, 555 AS image_file_id, 0 AS start_date, 'ALL' AS tag, 'N/A' AS name, 0 AS created_at, 0 AS updated_at
WHERE NOT EXISTS (SELECT 1 FROM company WHERE id = 555);

-- Insert a default certificate for cases where image_file_id is NULL
INSERT INTO certificate (id, file_id, company_id, created_at, updated_at)
SELECT 555 AS id, 555 AS file_id, 555 AS company_id, 0 AS created_at, 0 AS updated_at
WHERE NOT EXISTS (SELECT 1 FROM certificate WHERE id = 555);

-- Insert a default counter_party for cases where counter_party_id is NULL
INSERT INTO counterparty (id, company_id, name, tax_id, type, note, created_at, updated_at)
SELECT 555 AS id, 555 AS company_id, 'N/A' AS name, 'N/A' AS tax_id, 'N/A' AS type, 'N/A' AS note, 0 AS created_at, 0 AS updated_at
WHERE NOT EXISTS (SELECT 1 FROM counterparty WHERE id = 555);

ALTER TABLE "invoice" 
ADD COLUMN "certificate_id" INTEGER NOT NULL DEFAULT 555,
ADD COLUMN "counter_party_id" INTEGER NOT NULL DEFAULT 555,
ADD COLUMN "currency_alias" TEXT NOT NULL DEFAULT 'TWD',
ADD COLUMN "input_or_output" TEXT NOT NULL DEFAULT 'output',
ADD COLUMN "no" TEXT NOT NULL DEFAULT 'N/A',
ADD COLUMN "price_before_tax" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tax_price" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tax_ratio" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tax_type" TEXT NOT NULL DEFAULT 'taxable',
ADD COLUMN "total_price" INTEGER NOT NULL DEFAULT 0;


-- 更新 invoice 表中的 tax_type 基於 payment.has_tax 轉換
UPDATE invoice
SET tax_type = CASE
  WHEN p.has_tax = TRUE THEN 'taxable'
  ELSE 'tax free'
END,
tax_ratio = p.tax_percentage,
tax_price = p.tax_price,
price_before_tax = p.price - p.tax_price,
total_price = p.price + p.tax_price
FROM payment p
WHERE invoice.payment_id = p.id;

INSERT INTO certificate (file_id, company_id, created_at, updated_at)
SELECT i.image_file_id, j.company_id, i.created_at, i.updated_at
FROM invoice i
JOIN journal j ON i.journal_id = j.id
WHERE i.image_file_id IS NOT NULL;

-- Update invoice with correct certificate_id
UPDATE invoice
SET certificate_id = cert.id
FROM certificate cert
WHERE invoice.image_file_id = cert.file_id
AND cert.file_id IS NOT NULL;

-- Update invoices without image_file_id to use the default certificate
UPDATE invoice
SET certificate_id = cert.id
FROM certificate cert
WHERE cert.file_id = 555
AND invoice.image_file_id IS NULL;

-- AlterTable
ALTER TABLE "voucher"
ADD COLUMN     "company_id" INTEGER NOT NULL DEFAULT 555,
ADD COLUMN     "counter_party_id" INTEGER NOT NULL DEFAULT 555,
ADD COLUMN     "date" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "editable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "issuer_id" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'journal:JOURNAL.UPLOADED',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'payment';

INSERT INTO invoice_voucher_journal (invoice_id, voucher_id, journal_id, description, payment_id, payment_reason, vendor_or_supplier, created_at, updated_at)
SELECT i.id, v.id, j.id, i.description, i.payment_id, i.payment_reason, i.vendor_or_supplier, i.created_at, i.updated_at
FROM invoice i
JOIN journal j ON i.journal_id = j.id
JOIN voucher v ON j.id = v.journal_id;

ALTER TABLE "voucher" DROP COLUMN "journal_id";

ALTER TABLE "voucher"
ALTER COLUMN "company_id" DROP DEFAULT,
ALTER COLUMN "counter_party_id" DROP DEFAULT,
ALTER COLUMN "issuer_id" DROP DEFAULT,
ALTER COLUMN "date" DROP DEFAULT;

ALTER TABLE "invoice" DROP COLUMN "description",
DROP COLUMN "event_type",
DROP COLUMN "image_file_id",
DROP COLUMN "journal_id",
DROP COLUMN "number",
DROP COLUMN "payment_id",
DROP COLUMN "payment_reason",
DROP COLUMN "vendor_or_supplier",
DROP COLUMN "vendor_tax_id";

ALTER TABLE "invoice"
ALTER COLUMN "certificate_id" DROP DEFAULT,
ALTER COLUMN "counter_party_id" DROP DEFAULT,
ALTER COLUMN "currency_alias" DROP DEFAULT,
ALTER COLUMN "input_or_output" DROP DEFAULT,
ALTER COLUMN "no" DROP DEFAULT,
ALTER COLUMN "price_before_tax" DROP DEFAULT,
ALTER COLUMN "tax_price" DROP DEFAULT,
ALTER COLUMN "tax_ratio" DROP DEFAULT,
ALTER COLUMN "tax_type" DROP DEFAULT,
ALTER COLUMN "total_price" DROP DEFAULT;

-- AddUniqueConstraint
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_file_id_key" UNIQUE ("file_id");

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_voucher" ADD CONSTRAINT "asset_voucher_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_voucher" ADD CONSTRAINT "asset_voucher_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_voucher" ADD CONSTRAINT "associate_voucher_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_voucher" ADD CONSTRAINT "associate_voucher_original_voucher_id_fkey" FOREIGN KEY ("original_voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_voucher" ADD CONSTRAINT "associate_voucher_result_voucher_id_fkey" FOREIGN KEY ("result_voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty" ADD CONSTRAINT "counterparty_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_counter_party_id_fkey" FOREIGN KEY ("counter_party_id") REFERENCES "counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_voucher_journal" ADD CONSTRAINT "invoice_voucher_journal_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_voucher_journal" ADD CONSTRAINT "invoice_voucher_journal_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_voucher_journal" ADD CONSTRAINT "invoice_voucher_journal_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_payment_info" ADD CONSTRAINT "user_payment_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_certificate" ADD CONSTRAINT "user_certificate_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_certificate" ADD CONSTRAINT "user_certificate_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_voucher" ADD CONSTRAINT "user_voucher_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_voucher" ADD CONSTRAINT "user_voucher_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_counter_party_id_fkey" FOREIGN KEY ("counter_party_id") REFERENCES "counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_certificate" ADD CONSTRAINT "voucher_certificate_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_certificate" ADD CONSTRAINT "voucher_certificate_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER SEQUENCE "asset_voucher_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "associate_voucher_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "counterparty_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "certificate_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "event_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_payment_info_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_certificate_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_voucher_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "voucher_certificate_id_seq" RESTART WITH 10000000;
