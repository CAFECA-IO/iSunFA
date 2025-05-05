-- AlterTable
ALTER TABLE "certificate_rc2" ADD COLUMN     "voucher_id" INTEGER,
ALTER COLUMN "ai_result_id" DROP NOT NULL,
ALTER COLUMN "aiStatus" DROP NOT NULL,
ALTER COLUMN "issued_date" DROP NOT NULL,
ALTER COLUMN "net_amount" DROP NOT NULL,
ALTER COLUMN "no" DROP NOT NULL,
ALTER COLUMN "tax_amount" DROP NOT NULL,
ALTER COLUMN "tax_type" DROP NOT NULL,
ALTER COLUMN "total_amount" DROP NOT NULL,
ALTER COLUMN "type" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "certificate_rc2" ADD CONSTRAINT "certificate_rc2_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
