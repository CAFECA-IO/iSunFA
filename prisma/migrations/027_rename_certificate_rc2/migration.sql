/*
  Warnings:

  - The `type` column on the `certificate_rc2` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `direction` on the `certificate_rc2` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "InvoiceDirection" AS ENUM ('INPUT', 'OUTPUT');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('INPUT_20', 'INPUT_21', 'INPUT_22', 'INPUT_23', 'INPUT_24', 'INPUT_25', 'INPUT_26', 'INPUT_27', 'INPUT_28', 'INPUT_29', 'OUTPUT_30', 'OUTPUT_31', 'OUTPUT_32', 'OUTPUT_33', 'OUTPUT_34', 'OUTPUT_35', 'OUTPUT_36');

-- AlterTable
ALTER TABLE "certificate_rc2" DROP COLUMN "direction",
ADD COLUMN     "direction" "InvoiceDirection" NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "InvoiceType";

-- DropEnum
DROP TYPE "CertificateDirection";

-- DropEnum
DROP TYPE "CertificateType";
