-- DropForeignKey
ALTER TABLE "certificate_rc2" DROP CONSTRAINT "certificate_rc2_accountbook_id_fkey";

-- DropForeignKey
ALTER TABLE "certificate_rc2" DROP CONSTRAINT "certificate_rc2_file_id_fkey";

-- DropForeignKey
ALTER TABLE "certificate_rc2" DROP CONSTRAINT "certificate_rc2_uploader_id_fkey";

-- DropForeignKey
ALTER TABLE "certificate_rc2" DROP CONSTRAINT "certificate_rc2_voucher_id_fkey";


-- DropTable
DROP TABLE "certificate_rc2";
