/*
  Warnings:

  - You are about to drop the column `role_id` on the `user_role` table. All the data in the column will be lost.
  - You are about to drop the `admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `team_id` on table `company` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `role_name` to the `user_role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `user_role` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Tag" AS ENUM ('ALL', 'FINANCIAL', 'TAX');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ACCOUNTANT', 'BOOKKEEPER', 'EDUCATIONAL_TRIAL_VERSION', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('SYSTEM', 'COMPANY', 'USER');

-- DropForeignKey
ALTER TABLE "admin" DROP CONSTRAINT "admin_company_id_fkey";

-- DropForeignKey
ALTER TABLE "admin" DROP CONSTRAINT "admin_role_id_fkey";

-- DropForeignKey
ALTER TABLE "admin" DROP CONSTRAINT "admin_user_id_fkey";

-- DropForeignKey
ALTER TABLE "company" DROP CONSTRAINT "company_team_id_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_company_id_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_created_user_id_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_role_id_fkey";

-- DropForeignKey
ALTER TABLE "kyc_role" DROP CONSTRAINT "kyc_role_role_id_fkey";

-- DropForeignKey
ALTER TABLE "user_role" DROP CONSTRAINT "user_role_role_id_fkey";

-- AlterTable
ALTER TABLE "accountBook_transfer" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "tag" "Tag" NOT NULL DEFAULT 'ALL',
ALTER COLUMN "team_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "invite_team_member" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "order" ALTER COLUMN "user_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "team" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_invoice" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_payment_transaction" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_subscription" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "user_role" DROP COLUMN "role_id",
ADD COLUMN     "role_name" "RoleName" NOT NULL,
ADD COLUMN     "type" "RoleType" NOT NULL;

-- DropTable
DROP TABLE "admin";

-- DropTable
DROP TABLE "invitation";

-- DropTable
DROP TABLE "role";

-- CreateTable
CREATE TABLE "role_feature" (
    "id" SERIAL NOT NULL,
    "role_name" "RoleName" NOT NULL,
    "feature_key" TEXT NOT NULL,
    "feature_value" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "role_feature_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
