/*
  Warnings:

  - You are about to drop the column `tag` on the `company` table. All the data in the column will be lost.
  - The `monthsOfYear` column on the `event` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `last_login_at` on the `role` table. All the data in the column will be lost.
  - Added the required column `image_id` to the `news` table without a default value. This is not possible if the table is not empty.
  - Made the column `language` on table `user_setting` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "accounting_setting" ADD COLUMN     "created_at" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deleted_at" INTEGER,
ADD COLUMN     "updated_at" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "admin" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "tag" TEXT NOT NULL DEFAULT 'all';

-- Insert user 555 if not exists
INSERT INTO "user" (id, name, email, "image_File_id", created_at, updated_at )
SELECT 555, 'Default User', 'defaultuser@example.com', 555, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE id = 555);

-- AlterTable
ALTER TABLE "certificate" ADD COLUMN     "ai_result_id" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "uploader_id" INTEGER NOT NULL DEFAULT 555;

ALTER TABLE "certificate" 
ALTER COLUMN "uploader_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "company" DROP COLUMN "tag";

-- AlterTable
ALTER TABLE "event" DROP COLUMN "monthsOfYear",
ADD COLUMN     "monthsOfYear" INTEGER[];

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Invoice 001';

-- AlterTable
ALTER TABLE "news" ADD COLUMN     "image_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "role" DROP COLUMN "last_login_at",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'system';

-- AlterTable
ALTER TABLE "user_action_log" ADD COLUMN     "created_at" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deleted_at" INTEGER DEFAULT 0,
ADD COLUMN     "updated_at" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_role" ADD COLUMN     "last_login_at" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_setting" ALTER COLUMN "language" SET NOT NULL;

-- AlterTable
ALTER TABLE "voucher" ADD COLUMN     "ai_result_id" TEXT NOT NULL DEFAULT '0';

-- CreateTable
CREATE TABLE "associate_line_item" (
    "id" SERIAL NOT NULL,
    "accociate_voucher_id" INTEGER NOT NULL,
    "original_line_item_id" INTEGER NOT NULL,
    "result_line_item_id" INTEGER NOT NULL,
    "debit" BOOLEAN NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "associate_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todo" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "deadline" INTEGER NOT NULL,
    "note" TEXT,
    "status" BOOLEAN NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "todo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_todo_company" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "todo_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_todo_company_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "associate_line_item" ADD CONSTRAINT "associate_line_item_accociate_voucher_id_fkey" FOREIGN KEY ("accociate_voucher_id") REFERENCES "associate_voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_line_item" ADD CONSTRAINT "associate_line_item_original_line_item_id_fkey" FOREIGN KEY ("original_line_item_id") REFERENCES "line_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_line_item" ADD CONSTRAINT "associate_line_item_result_line_item_id_fkey" FOREIGN KEY ("result_line_item_id") REFERENCES "line_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_action_log" ADD CONSTRAINT "user_action_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_todo_company" ADD CONSTRAINT "user_todo_company_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_todo_company" ADD CONSTRAINT "user_todo_company_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_todo_company" ADD CONSTRAINT "user_todo_company_todo_id_fkey" FOREIGN KEY ("todo_id") REFERENCES "todo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER SEQUENCE "associate_line_item_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "todo_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_todo_company_id_seq" RESTART WITH 10000000;
