-- DropForeignKey
ALTER TABLE "voucher" DROP CONSTRAINT "voucher_counter_party_id_fkey";

-- AlterTable
ALTER TABLE "voucher" ALTER COLUMN "counter_party_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_counter_party_id_fkey" FOREIGN KEY ("counter_party_id") REFERENCES "counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
