/*
  Warnings:

  - Added the required column `user_id` to the `order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "accountBook_transfer" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "invite_team_member" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "detail" JSONB,
ADD COLUMN     "user_id" INTEGER NOT NULL;

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
ALTER TABLE "user_payment_info" ADD COLUMN     "default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "info" JSONB;
