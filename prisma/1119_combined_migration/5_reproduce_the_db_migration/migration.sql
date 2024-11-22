/*
  Warnings:

  - You are about to drop the column `accociate_voucher_id` on the `associate_line_item` table. All the data in the column will be lost.
  - You are about to drop the column `frequence` on the `event` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `account` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `associate_voucher_id` to the `associate_line_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frequency` to the `event` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
-- ALTER TABLE "associate_line_item" DROP CONSTRAINT "associate_line_item_accociate_voucher_id_fkey";

-- AlterTable
ALTER TABLE "associate_line_item" RENAME COLUMN "accociate_voucher_id" TO "associate_voucher_id";
-- ADD COLUMN     "associate_voucher_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "company_setting" ADD COLUMN     "country_code" TEXT NOT NULL DEFAULT 'tw';

-- AlterTable
ALTER TABLE "event" RENAME COLUMN "frequence" TO "frequency";
-- DROP COLUMN "frequence",
-- ADD COLUMN     "frequency" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "account_id_key" ON "account"("id");

-- AddForeignKey
-- ALTER TABLE "associate_line_item" ADD CONSTRAINT "associate_line_item_associate_voucher_id_fkey" FOREIGN KEY ("associate_voucher_id") REFERENCES "associate_voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
