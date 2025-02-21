-- CreateEnum
CREATE TYPE "TeamPlanType" AS ENUM ('BEGINNER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "TeamPaymentStatus" AS ENUM ('PAID', 'UNPAID', 'FREE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- CreateTable
CREATE TABLE "team_plan" (
    "id" SERIAL NOT NULL,
    "type" "TeamPlanType" NOT NULL,
    "plan_name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "extra_member_price" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_plan_feature" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "feature_key" TEXT NOT NULL,
    "feature_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_plan_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "TeamRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_subscription" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "autoRenewal" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expiredDate" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "TeamPaymentStatus" NOT NULL,
    "lastTransactionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_payment_transaction" (
    "id" SERIAL NOT NULL,
    "subscription_id" INTEGER NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_payment_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invoice" (
    "id" SERIAL NOT NULL,
    "subscription_id" INTEGER NOT NULL,
    "issuedTimestamp" TIMESTAMP(3) NOT NULL,
    "dueTimestamp" TIMESTAMP(3) NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "planStartDate" TIMESTAMP(3) NOT NULL,
    "planEndDate" TIMESTAMP(3) NOT NULL,
    "planQuantity" INTEGER NOT NULL,
    "planUnitPrice" INTEGER NOT NULL,
    "planAmount" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "amountDue" INTEGER NOT NULL,
    "payerName" TEXT NOT NULL,
    "payerAddress" TEXT NOT NULL,
    "payerPhone" TEXT NOT NULL,
    "payerTaxId" TEXT NOT NULL,
    "payeeName" TEXT NOT NULL,
    "payeeAddress" TEXT NOT NULL,
    "payeePhone" TEXT NOT NULL,
    "payeeTaxId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_plan_type_key" ON "team_plan"("type");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_team_id_user_id_key" ON "team_member"("team_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_subscription_team_id_key" ON "team_subscription"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_payment_transaction_subscription_id_key" ON "team_payment_transaction"("subscription_id");

-- AddForeignKey
ALTER TABLE "team_plan_feature" ADD CONSTRAINT "team_plan_feature_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "team_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_subscription" ADD CONSTRAINT "team_subscription_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_subscription" ADD CONSTRAINT "team_subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "team_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment_transaction" ADD CONSTRAINT "team_payment_transaction_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "team_subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invoice" ADD CONSTRAINT "team_invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "team_subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invoice" ADD CONSTRAINT "team_invoice_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "team_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
