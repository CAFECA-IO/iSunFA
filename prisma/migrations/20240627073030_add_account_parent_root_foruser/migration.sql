/*
  Warnings:

  - You are about to drop the column `aich_result_id` on the `contract` table. All the data in the column will be lost.
  - You are about to drop the `account` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_company_id_fkey";

-- DropForeignKey
ALTER TABLE "line_item" DROP CONSTRAINT "line_item_account_id_fkey";

-- DropIndex
DROP INDEX "contract_aich_result_id_key";

-- AlterTable
ALTER TABLE "contract" DROP COLUMN "aich_result_id";

-- DropTable
DROP TABLE "account";

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 0,
    "system" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "debit" BOOLEAN NOT NULL,
    "liquidity" BOOLEAN NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "for_user" BOOLEAN NOT NULL,
    "parent_code" TEXT NOT NULL,
    "root_code" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_code_key" ON "Account"("code");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parent_code_fkey" FOREIGN KEY ("parent_code") REFERENCES "Account"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_root_code_fkey" FOREIGN KEY ("root_code") REFERENCES "Account"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_item" ADD CONSTRAINT "line_item_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
