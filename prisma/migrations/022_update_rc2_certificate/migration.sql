/*
  Warnings:

  - You are about to drop the column `input_or_output` on the `certificate_rc2` table. All the data in the column will be lost.
  - You are about to drop the `_InvoiceRC2ToInvoiceVoucherJournal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoice_rc2` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `voucher_certificate_rc2` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `currency_code` to the `certificate_rc2` table without a default value. This is not possible if the table is not empty.
  - Added the required column `direction` to the `certificate_rc2` table without a default value. This is not possible if the table is not empty.
  - Added the required column `issued_date` to the `certificate_rc2` table without a default value. This is not possible if the table is not empty.
  - Added the required column `net_amount` to the `certificate_rc2` table without a default value. This is not possible if the table is not empty.
  - Added the required column `no` to the `certificate_rc2` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax_amount` to the `certificate_rc2` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax_type` to the `certificate_rc2` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_amount` to the `certificate_rc2` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `certificate_rc2` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CertificateDirection" AS ENUM ('INPUT', 'OUTPUT');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('INPUT_21', 'INPUT_22', 'INPUT_23', 'INPUT_24', 'INPUT_25', 'INPUT_26', 'INPUT_27', 'INPUT_28', 'INPUT_29', 'OUTPUT_31', 'OUTPUT_32', 'OUTPUT_35', 'OUTPUT_36');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('TWD', 'EUR');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('TAXABLE', 'TAX_FREE');

-- DropForeignKey
ALTER TABLE "_InvoiceRC2ToInvoiceVoucherJournal" DROP CONSTRAINT "_InvoiceRC2ToInvoiceVoucherJournal_A_fkey";

-- DropForeignKey
ALTER TABLE "_InvoiceRC2ToInvoiceVoucherJournal" DROP CONSTRAINT "_InvoiceRC2ToInvoiceVoucherJournal_B_fkey";

-- DropForeignKey
ALTER TABLE "invoice_rc2" DROP CONSTRAINT "invoice_rc2_certificate_id_fkey";

-- DropForeignKey
ALTER TABLE "voucher_certificate_rc2" DROP CONSTRAINT "voucher_certificate_rc2_certificate_id_fkey";

-- DropForeignKey
ALTER TABLE "voucher_certificate_rc2" DROP CONSTRAINT "voucher_certificate_rc2_voucher_id_fkey";

-- AlterTable
ALTER TABLE "certificate_rc2" DROP COLUMN "input_or_output",
ADD COLUMN     "buyer_id_number" TEXT,
ADD COLUMN     "buyer_name" TEXT,
ADD COLUMN     "carrier_serial_number" TEXT,
ADD COLUMN     "currency_code" "CurrencyCode" NOT NULL,
ADD COLUMN     "deduction_type" "DeductionType",
ADD COLUMN     "direction" "CertificateDirection" NOT NULL,
ADD COLUMN     "is_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_shared_amount" BOOLEAN DEFAULT false,
ADD COLUMN     "issued_date" INTEGER NOT NULL,
ADD COLUMN     "net_amount" INTEGER NOT NULL,
ADD COLUMN     "no" TEXT NOT NULL,
ADD COLUMN     "other_certificate_no" TEXT,
ADD COLUMN     "return_or_allowance" BOOLEAN DEFAULT false,
ADD COLUMN     "sales_id_number" TEXT,
ADD COLUMN     "sales_name" TEXT,
ADD COLUMN     "tax_amount" INTEGER NOT NULL,
ADD COLUMN     "tax_rate" INTEGER,
ADD COLUMN     "tax_type" "TaxType" NOT NULL,
ADD COLUMN     "total_amount" INTEGER NOT NULL,
ADD COLUMN     "total_of_summarized_invoices" INTEGER,
ADD COLUMN     "type" "CertificateType" NOT NULL;

-- DropTable
DROP TABLE "_InvoiceRC2ToInvoiceVoucherJournal";

-- DropTable
DROP TABLE "invoice_rc2";

-- DropTable
DROP TABLE "voucher_certificate_rc2";
