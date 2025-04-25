/*
  Warnings:

  - The values [ACCOUNTANT,BOOKKEEPER,EDUCATIONAL_TRIAL_VERSION,TEST] on the enum `RoleName` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "DeductionType" AS ENUM ('DEDUCTIBLE_PURCHASE_AND_EXPENSE', 'DEDUCTIBLE_FIXED_ASSETS', 'NON_DEDUCTIBLE_PURCHASE_AND_EXPENSE', 'NON_DEDUCTIBLE_FIXED_ASSETS');

-- AlterEnum
BEGIN;
CREATE TYPE "RoleName_new" AS ENUM ('INDIVIDUAL', 'ACCOUNTING_FIRMS', 'ENTERPRISE');
ALTER TABLE "user_role" ALTER COLUMN "role_name" TYPE "RoleName_new" USING ("role_name"::text::"RoleName_new");
ALTER TABLE "role_feature" ALTER COLUMN "role_name" TYPE "RoleName_new" USING ("role_name"::text::"RoleName_new");
ALTER TYPE "RoleName" RENAME TO "RoleName_old";
ALTER TYPE "RoleName_new" RENAME TO "RoleName";
DROP TYPE "RoleName_old";
COMMIT;

-- CreateTable
CREATE TABLE "invoice_rc2" (
    "id" SERIAL NOT NULL,
    "certificate_id" INTEGER NOT NULL,
    "input_or_output" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" INTEGER NOT NULL,
    "no" TEXT NOT NULL,
    "currency_alias" TEXT NOT NULL,
    "price_before_tax" INTEGER NOT NULL,
    "tax_type" TEXT NOT NULL,
    "tax_ratio" INTEGER NOT NULL,
    "tax_price" INTEGER NOT NULL,
    "total_price" INTEGER NOT NULL,
    "deduction_type" TEXT,
    "sales_name" TEXT,
    "sales_id_number" TEXT,
    "buyer_name" TEXT,
    "buyer_id_number" TEXT,
    "return_or_allowance" BOOLEAN DEFAULT false,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "invoice_rc2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_certificate_rc2" (
    "id" SERIAL NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "certificate_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "voucher_certificate_rc2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_rc2" (
    "id" SERIAL NOT NULL,
    "accountbook_id" INTEGER NOT NULL,
    "file_id" INTEGER NOT NULL,
    "uploader_id" INTEGER NOT NULL,
    "input_or_output" TEXT NOT NULL,
    "ai_result_id" TEXT NOT NULL DEFAULT '0',
    "aiStatus" TEXT NOT NULL DEFAULT 'READY',
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "certificate_rc2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InvoiceRC2ToInvoiceVoucherJournal" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_rc2_certificate_id_key" ON "invoice_rc2"("certificate_id");

-- CreateIndex
CREATE UNIQUE INDEX "_InvoiceRC2ToInvoiceVoucherJournal_AB_unique" ON "_InvoiceRC2ToInvoiceVoucherJournal"("A", "B");

-- CreateIndex
CREATE INDEX "_InvoiceRC2ToInvoiceVoucherJournal_B_index" ON "_InvoiceRC2ToInvoiceVoucherJournal"("B");

-- AddForeignKey
ALTER TABLE "invoice_rc2" ADD CONSTRAINT "invoice_rc2_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificate_rc2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_certificate_rc2" ADD CONSTRAINT "voucher_certificate_rc2_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_certificate_rc2" ADD CONSTRAINT "voucher_certificate_rc2_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificate_rc2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_rc2" ADD CONSTRAINT "certificate_rc2_accountbook_id_fkey" FOREIGN KEY ("accountbook_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_rc2" ADD CONSTRAINT "certificate_rc2_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_rc2" ADD CONSTRAINT "certificate_rc2_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InvoiceRC2ToInvoiceVoucherJournal" ADD CONSTRAINT "_InvoiceRC2ToInvoiceVoucherJournal_A_fkey" FOREIGN KEY ("A") REFERENCES "invoice_rc2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InvoiceRC2ToInvoiceVoucherJournal" ADD CONSTRAINT "_InvoiceRC2ToInvoiceVoucherJournal_B_fkey" FOREIGN KEY ("B") REFERENCES "invoice_voucher_journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
