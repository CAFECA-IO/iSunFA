/*
  Warnings:

  - You are about to drop the `pending_team_member` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'COMPLETED', 'DECLINED', 'CANCELED', 'FAILED');

-- DropForeignKey
ALTER TABLE "pending_team_member" DROP CONSTRAINT "pending_team_member_team_id_fkey";

-- AlterTable
ALTER TABLE "accountBook_transfer" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

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

-- DropTable
DROP TABLE "pending_team_member";

-- CreateTable
CREATE TABLE "invite_team_member" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "updated_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "pending_at" INTEGER,
    "accepted_at" INTEGER,
    "declined_at" INTEGER,
    "canceled_at" INTEGER,
    "note" JSONB DEFAULT '{}',

    CONSTRAINT "invite_team_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_team_member_email_key" ON "invite_team_member"("email");

-- AddForeignKey
ALTER TABLE "invite_team_member" ADD CONSTRAINT "invite_team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
