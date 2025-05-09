-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "CertificateType" ADD VALUE 'INPUT_20';
ALTER TYPE "CertificateType" ADD VALUE 'OUTPUT_30';

-- AlterTable
ALTER TABLE "certificate_rc2" ADD COLUMN     "description" TEXT,
ADD COLUMN     "incomplete" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "note" JSONB;
