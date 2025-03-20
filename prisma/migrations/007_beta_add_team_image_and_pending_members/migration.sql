/*
  Warnings:

  - A unique constraint covering the columns `[image_file_id]` on the table `team` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "team_id_key";

-- AlterTable
ALTER TABLE "team" ADD COLUMN     "image_file_id" INTEGER,
ADD COLUMN     "updated_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_invoice" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_payment_transaction" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_subscription" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- CreateTable
CREATE TABLE "pending_team_member" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,

    CONSTRAINT "pending_team_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_team_member_email_key" ON "pending_team_member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "team_image_file_id_key" ON "team"("image_file_id");

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_team_member" ADD CONSTRAINT "pending_team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
