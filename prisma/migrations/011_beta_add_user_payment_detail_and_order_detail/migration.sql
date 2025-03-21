-- AlterTable
ALTER TABLE "order" ADD COLUMN     "detail" JSONB,
ADD COLUMN     "user_id" INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE "user_payment_info" ADD COLUMN     "default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "detail" JSONB;
