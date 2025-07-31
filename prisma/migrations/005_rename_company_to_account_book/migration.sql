/*
  Warnings:

  - You are about to drop the column `company_id` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `accounting_setting` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `asset` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `audit_report` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `certificate` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `contract` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `counterparty` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `department` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `employee` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `income_expense` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `journal` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `ocr` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `project` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `subscription` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `voucher` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `voucher_salary_record_folder` table. All the data in the column will be lost.
  - The `company` table will be renamed to `account_book`. All the data will be preserved.
  - The `company_kyc` table will be renamed to `account_book_kyc`. All the data will be preserved.
  - The `company_setting` table will be renamed to `account_book_setting`. All the data will be preserved.
  - The `user_todo_company` table will be renamed to `user_todo_account_book`. All the data will be preserved.
  - All constraints and indexes will be renamed accordingly. No data will be lost.
  - Added the required column `account_book_id` to the `accounting_setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `audit_report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `certificate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `counterparty` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `income_expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `journal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `ocr` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `voucher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_book_id` to the `voucher_salary_record_folder` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Drop foreign key constraints that reference columns we're about to rename
-- (We need to drop these because we can't rename columns that are referenced by foreign keys)
ALTER TABLE "account" DROP CONSTRAINT "account_company_id_fkey";
ALTER TABLE "accountBook_transfer" DROP CONSTRAINT "accountBook_transfer_company_id_fkey";
ALTER TABLE "accounting_setting" DROP CONSTRAINT "accounting_setting_company_id_fkey";
ALTER TABLE "asset" DROP CONSTRAINT "asset_company_id_fkey";
ALTER TABLE "audit_report" DROP CONSTRAINT "audit_report_company_id_fkey";
ALTER TABLE "certificate" DROP CONSTRAINT "certificate_company_id_fkey";
ALTER TABLE "contract" DROP CONSTRAINT "contract_company_id_fkey";
ALTER TABLE "counterparty" DROP CONSTRAINT "counterparty_company_id_fkey";
ALTER TABLE "department" DROP CONSTRAINT "department_company_id_fkey";
ALTER TABLE "employee" DROP CONSTRAINT "employee_company_id_fkey";
ALTER TABLE "income_expense" DROP CONSTRAINT "income_expense_company_id_fkey";
ALTER TABLE "journal" DROP CONSTRAINT "journal_company_id_fkey";
ALTER TABLE "ocr" DROP CONSTRAINT "ocr_company_id_fkey";
ALTER TABLE "order" DROP CONSTRAINT "order_company_id_fkey";
ALTER TABLE "project" DROP CONSTRAINT "project_company_id_fkey";
ALTER TABLE "report" DROP CONSTRAINT "report_company_id_fkey";
ALTER TABLE "subscription" DROP CONSTRAINT "subscription_company_id_fkey";
ALTER TABLE "voucher" DROP CONSTRAINT "voucher_company_id_fkey";
ALTER TABLE "voucher_salary_record_folder" DROP CONSTRAINT "voucher_salary_record_folder_company_id_fkey";
ALTER TABLE "company_kyc" DROP CONSTRAINT "company_kyc_company_id_fkey";
ALTER TABLE "company_setting" DROP CONSTRAINT "company_setting_company_id_fkey";
ALTER TABLE "user_todo_company" DROP CONSTRAINT "user_todo_company_company_id_fkey";
ALTER TABLE "user_todo_company" DROP CONSTRAINT "user_todo_company_todo_id_fkey";
ALTER TABLE "user_todo_company" DROP CONSTRAINT "user_todo_company_user_id_fkey";
ALTER TABLE "invoice_rc2" DROP CONSTRAINT "invoice_rc2_accountbook_id_fkey";

-- Step 2: Rename tables to preserve data
ALTER TABLE "company" RENAME TO "account_book";
ALTER TABLE "company_kyc" RENAME TO "account_book_kyc";
ALTER TABLE "company_setting" RENAME TO "account_book_setting";
ALTER TABLE "user_todo_company" RENAME TO "user_todo_account_book";
ALTER TABLE "accountBook_transfer" RENAME COLUMN "company_id" TO "account_book_id";

-- Step 3: Rename constraints on the renamed tables (more efficient than drop/create)
ALTER TABLE "account_book" RENAME CONSTRAINT "company_image_file_id_fkey" TO "account_book_image_file_id_fkey";
ALTER TABLE "account_book" RENAME CONSTRAINT "company_team_id_fkey" TO "account_book_team_id_fkey";
ALTER TABLE "account_book" RENAME CONSTRAINT "company_user_id_fkey" TO "account_book_user_id_fkey";
ALTER TABLE "account_book_kyc" RENAME CONSTRAINT "company_kyc_registration_certificate_file_id_fkey" TO "account_book_kyc_registration_certificate_file_id_fkey";
ALTER TABLE "account_book_kyc" RENAME CONSTRAINT "company_kyc_representative_id_card_file_id_fkey" TO "account_book_kyc_representative_id_card_file_id_fkey";
ALTER TABLE "account_book_kyc" RENAME CONSTRAINT "company_kyc_tax_certificate_file_id_fkey" TO "account_book_kyc_tax_certificate_file_id_fkey";

-- Step 4: Rename indexes on the renamed tables (more efficient than drop/create)
ALTER INDEX "company_image_file_id_key" RENAME TO "account_book_image_file_id_key";
ALTER INDEX "company_kyc_registration_certificate_file_id_key" RENAME TO "account_book_kyc_registration_certificate_file_id_key";
ALTER INDEX "company_kyc_tax_certificate_file_id_key" RENAME TO "account_book_kyc_tax_certificate_file_id_key";
ALTER INDEX "company_kyc_representative_id_card_file_id_key" RENAME TO "account_book_kyc_representative_id_card_file_id_key";
ALTER INDEX "company_setting_company_id_key" RENAME TO "account_book_setting_account_book_id_key";

-- Step 5: Rename columns in renamed tables
ALTER TABLE "account_book_kyc" RENAME COLUMN "company_id" TO "account_book_id";
ALTER TABLE "account_book_setting" RENAME COLUMN "company_id" TO "account_book_id";
ALTER TABLE "user_todo_account_book" RENAME COLUMN "company_id" TO "account_book_id";

-- Step 6: Rename columns in other tables with proper data migration
-- For tables with existing data, we need to:
-- 1. Add new column with default value
-- 2. Copy data from old column to new column
-- 3. Drop old column
-- 4. Remove default value (if needed)

-- Handle account table
ALTER TABLE "account" ADD COLUMN "account_book_id" INTEGER DEFAULT 0;
UPDATE "account" SET "account_book_id" = "company_id";
ALTER TABLE "account" DROP COLUMN "company_id";
ALTER TABLE "account" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle accounting_setting table
ALTER TABLE "accounting_setting" ADD COLUMN "account_book_id" INTEGER;
UPDATE "accounting_setting" SET "account_book_id" = "company_id";
ALTER TABLE "accounting_setting" DROP COLUMN "company_id";
ALTER TABLE "accounting_setting" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle asset table
ALTER TABLE "asset" ADD COLUMN "account_book_id" INTEGER;
UPDATE "asset" SET "account_book_id" = "company_id";
ALTER TABLE "asset" DROP COLUMN "company_id";
ALTER TABLE "asset" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle audit_report table
ALTER TABLE "audit_report" ADD COLUMN "account_book_id" INTEGER;
UPDATE "audit_report" SET "account_book_id" = "company_id";
ALTER TABLE "audit_report" DROP COLUMN "company_id";
ALTER TABLE "audit_report" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle certificate table
ALTER TABLE "certificate" ADD COLUMN "account_book_id" INTEGER;
UPDATE "certificate" SET "account_book_id" = "company_id";
ALTER TABLE "certificate" DROP COLUMN "company_id";
ALTER TABLE "certificate" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle contract table
ALTER TABLE "contract" ADD COLUMN "account_book_id" INTEGER;
UPDATE "contract" SET "account_book_id" = "company_id";
ALTER TABLE "contract" DROP COLUMN "company_id";
ALTER TABLE "contract" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle counterparty table
ALTER TABLE "counterparty" ADD COLUMN "account_book_id" INTEGER;
UPDATE "counterparty" SET "account_book_id" = "company_id";
ALTER TABLE "counterparty" DROP COLUMN "company_id";
ALTER TABLE "counterparty" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle department table
ALTER TABLE "department" ADD COLUMN "account_book_id" INTEGER;
UPDATE "department" SET "account_book_id" = "company_id";
ALTER TABLE "department" DROP COLUMN "company_id";
ALTER TABLE "department" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle employee table
ALTER TABLE "employee" ADD COLUMN "account_book_id" INTEGER;
UPDATE "employee" SET "account_book_id" = "company_id";
ALTER TABLE "employee" DROP COLUMN "company_id";
ALTER TABLE "employee" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle income_expense table
ALTER TABLE "income_expense" ADD COLUMN "account_book_id" INTEGER;
UPDATE "income_expense" SET "account_book_id" = "company_id";
ALTER TABLE "income_expense" DROP COLUMN "company_id";
ALTER TABLE "income_expense" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle journal table
ALTER TABLE "journal" ADD COLUMN "account_book_id" INTEGER;
UPDATE "journal" SET "account_book_id" = "company_id";
ALTER TABLE "journal" DROP COLUMN "company_id";
ALTER TABLE "journal" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle ocr table
ALTER TABLE "ocr" ADD COLUMN "account_book_id" INTEGER;
UPDATE "ocr" SET "account_book_id" = "company_id";
ALTER TABLE "ocr" DROP COLUMN "company_id";
ALTER TABLE "ocr" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle order table
ALTER TABLE "order" ADD COLUMN "account_book_id" INTEGER;
UPDATE "order" SET "account_book_id" = "company_id";
ALTER TABLE "order" DROP COLUMN "company_id";
ALTER TABLE "order" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle project table
ALTER TABLE "project" ADD COLUMN "account_book_id" INTEGER;
UPDATE "project" SET "account_book_id" = "company_id";
ALTER TABLE "project" DROP COLUMN "company_id";
ALTER TABLE "project" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle report table
ALTER TABLE "report" ADD COLUMN "account_book_id" INTEGER;
UPDATE "report" SET "account_book_id" = "company_id";
ALTER TABLE "report" DROP COLUMN "company_id";
ALTER TABLE "report" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle subscription table
ALTER TABLE "subscription" ADD COLUMN "account_book_id" INTEGER;
UPDATE "subscription" SET "account_book_id" = "company_id";
ALTER TABLE "subscription" DROP COLUMN "company_id";
ALTER TABLE "subscription" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle voucher table
ALTER TABLE "voucher" ADD COLUMN "account_book_id" INTEGER;
UPDATE "voucher" SET "account_book_id" = "company_id";
ALTER TABLE "voucher" DROP COLUMN "company_id";
ALTER TABLE "voucher" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Handle voucher_salary_record_folder table
ALTER TABLE "voucher_salary_record_folder" ADD COLUMN "account_book_id" INTEGER;
UPDATE "voucher_salary_record_folder" SET "account_book_id" = "company_id";
ALTER TABLE "voucher_salary_record_folder" DROP COLUMN "company_id";
ALTER TABLE "voucher_salary_record_folder" ALTER COLUMN "account_book_id" SET NOT NULL;

-- Step 7: Update default timestamps for other tables (unrelated to our main changes)
ALTER TABLE "accountBook_transfer" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

ALTER TABLE "invite_team_member" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

ALTER TABLE "team" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

ALTER TABLE "team_invoice" ALTER COLUMN "issued_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

ALTER TABLE "team_payment" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

ALTER TABLE "team_payment_transaction" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

ALTER TABLE "team_subscription" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- Step 8: Recreate foreign key constraints with new names and references
ALTER TABLE "account" ADD CONSTRAINT "account_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "asset" ADD CONSTRAINT "asset_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_report" ADD CONSTRAINT "audit_report_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "accounting_setting" ADD CONSTRAINT "accounting_setting_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "counterparty" ADD CONSTRAINT "counterparty_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "account_book_kyc" ADD CONSTRAINT "account_book_kyc_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "account_book_setting" ADD CONSTRAINT "account_book_setting_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract" ADD CONSTRAINT "contract_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "certificate" ADD CONSTRAINT "certificate_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoice_rc2" ADD CONSTRAINT "invoice_rc2_accountbook_id_fkey" FOREIGN KEY ("accountbook_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "department" ADD CONSTRAINT "department_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee" ADD CONSTRAINT "employee_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "income_expense" ADD CONSTRAINT "income_expense_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "journal" ADD CONSTRAINT "journal_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ocr" ADD CONSTRAINT "ocr_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order" ADD CONSTRAINT "order_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project" ADD CONSTRAINT "project_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "report" ADD CONSTRAINT "report_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription" ADD CONSTRAINT "subscription_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_todo_account_book" ADD CONSTRAINT "user_todo_account_book_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_todo_account_book" ADD CONSTRAINT "user_todo_account_book_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_todo_account_book" ADD CONSTRAINT "user_todo_account_book_todo_id_fkey" FOREIGN KEY ("todo_id") REFERENCES "todo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "voucher" ADD CONSTRAINT "voucher_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "voucher_salary_record_folder" ADD CONSTRAINT "voucher_salary_record_folder_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "accountBook_transfer" ADD CONSTRAINT "accountBook_transfer_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

