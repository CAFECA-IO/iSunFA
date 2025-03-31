/*
  Warnings:

  - You are about to drop the column `amount_due` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `due_timestamp` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `issued_timestamp` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `payee_address` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `payee_name` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `payee_phone` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `payee_tax_id` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `payer_tax_id` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `plan_amount` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `plan_end_date` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `plan_id` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `plan_quantity` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `plan_start_date` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `plan_unit_price` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_id` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `team_invoice` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `team_payment_transaction` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_id` on the `team_payment_transaction` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_id` on the `team_payment_transaction` table. All the data in the column will be lost.
  - You are about to drop the column `auto_renewal` on the `team_subscription` table. All the data in the column will be lost.
  - You are about to drop the column `last_transaction_id` on the `team_subscription` table. All the data in the column will be lost.
  - You are about to drop the column `payment_status` on the `team_subscription` table. All the data in the column will be lost.
  - You are about to drop the column `plan_id` on the `team_subscription` table. All the data in the column will be lost.
  - You are about to drop the `admin_backup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invitation_backup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_backup` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `currency` to the `team_invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoice_code` to the `team_invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `team_invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `team_invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team_order_id` to the `team_invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team_payment_transaction_id` to the `team_invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `team_payment_transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_gateway` to the `team_payment_transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team_order_id` to the `team_payment_transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_payment_info_id` to the `team_payment_transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'REFUNDED';


-- DropForeignKey
ALTER TABLE "company" DROP CONSTRAINT "company_team_id_fkey";


-- DropForeignKey
ALTER TABLE "team_invoice" DROP CONSTRAINT "team_invoice_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "team_invoice" DROP CONSTRAINT "team_invoice_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "team_payment_transaction" DROP CONSTRAINT "team_payment_transaction_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "team_subscription" DROP CONSTRAINT "team_subscription_plan_id_fkey";

-- DropIndex
DROP INDEX "team_payment_transaction_subscription_id_key";

-- DropIndex
DROP INDEX "team_subscription_team_id_key";

-- AlterTable
ALTER TABLE "accountBook_transfer" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "invite_team_member" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_invoice" DROP COLUMN "amount_due",
DROP COLUMN "due_timestamp",
DROP COLUMN "issued_timestamp",
DROP COLUMN "payee_address",
DROP COLUMN "payee_name",
DROP COLUMN "payee_phone",
DROP COLUMN "payee_tax_id",
DROP COLUMN "payer_tax_id",
DROP COLUMN "plan_amount",
DROP COLUMN "plan_end_date",
DROP COLUMN "plan_id",
DROP COLUMN "plan_quantity",
DROP COLUMN "plan_start_date",
DROP COLUMN "plan_unit_price",
DROP COLUMN "subscription_id",
DROP COLUMN "subtotal",
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "invoice_code" TEXT NOT NULL,
ADD COLUMN     "issued_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ADD COLUMN     "payer_email" TEXT,
ADD COLUMN     "payer_id" TEXT,
ADD COLUMN     "price" INTEGER NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "team_order_id" INTEGER NOT NULL,
ADD COLUMN     "team_payment_transaction_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "payer_name" DROP NOT NULL,
ALTER COLUMN "payer_address" DROP NOT NULL,
ALTER COLUMN "payer_phone" DROP NOT NULL,
ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_payment_transaction" DROP COLUMN "payment_method",
DROP COLUMN "subscription_id",
DROP COLUMN "transaction_id",
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "payment_gateway" TEXT NOT NULL,
ADD COLUMN     "payment_getway_record_id" TEXT,
ADD COLUMN     "team_order_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ADD COLUMN     "user_payment_info_id" INTEGER NOT NULL,
ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_subscription" DROP COLUMN "auto_renewal",
DROP COLUMN "last_transaction_id",
DROP COLUMN "payment_status",
DROP COLUMN "plan_id",
ADD COLUMN     "plan_type" "TeamPlanType" NOT NULL DEFAULT 'PROFESSIONAL',
ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- DropTable
DROP TABLE "admin_backup";

-- DropTable
DROP TABLE "invitation_backup";

-- DropTable
DROP TABLE "role_backup";

-- CreateTable
CREATE TABLE "team_order" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "team_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_order_detail" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "team_order_detail_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_subscription" ADD CONSTRAINT "team_subscription_plan_type_fkey" FOREIGN KEY ("plan_type") REFERENCES "team_plan"("type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_order" ADD CONSTRAINT "team_order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_order" ADD CONSTRAINT "team_order_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_order_detail" ADD CONSTRAINT "team_order_detail_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "team_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment_transaction" ADD CONSTRAINT "team_payment_transaction_team_order_id_fkey" FOREIGN KEY ("team_order_id") REFERENCES "team_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment_transaction" ADD CONSTRAINT "team_payment_transaction_user_payment_info_id_fkey" FOREIGN KEY ("user_payment_info_id") REFERENCES "user_payment_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invoice" ADD CONSTRAINT "team_invoice_team_order_id_fkey" FOREIGN KEY ("team_order_id") REFERENCES "team_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invoice" ADD CONSTRAINT "team_invoice_team_payment_transaction_id_fkey" FOREIGN KEY ("team_payment_transaction_id") REFERENCES "team_payment_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
