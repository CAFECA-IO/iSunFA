/*
  Warnings:

  - You are about to drop the `user_certificate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_voucher` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoleName" ADD VALUE 'INDIVIDUAL';
ALTER TYPE "RoleName" ADD VALUE 'ACCOUNTING_FIRMS';

-- DropForeignKey
ALTER TABLE "user_certificate" DROP CONSTRAINT "user_certificate_certificate_id_fkey";

-- DropForeignKey
ALTER TABLE "user_certificate" DROP CONSTRAINT "user_certificate_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_voucher" DROP CONSTRAINT "user_voucher_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_voucher" DROP CONSTRAINT "user_voucher_voucher_id_fkey";

-- AlterTable
ALTER TABLE "accountBook_transfer" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- DropTable
DROP TABLE "user_certificate";

-- DropTable
DROP TABLE "user_voucher";
