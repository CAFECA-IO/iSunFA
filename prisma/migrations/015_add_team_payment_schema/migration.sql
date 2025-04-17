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
ALTER TABLE "team_invoice" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "issued_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_payment_transaction" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_subscription" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- DropEnum
DROP TYPE "TeamPaymentStatus";

-- CreateTable
CREATE TABLE "team_payment" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "team_plan_type" "TeamPlanType" NOT NULL,
    "user_payment_info_id" INTEGER,
    "auto_renewal" BOOLEAN NOT NULL,
    "start_date" INTEGER NOT NULL,
    "expired_date" INTEGER NOT NULL,
    "next_charge_date" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "updated_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,

    CONSTRAINT "TeamPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_payment_team_id_key" ON "team_payment"("team_id");

-- AddForeignKey
ALTER TABLE "team_payment" ADD CONSTRAINT "team_payment_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment" ADD CONSTRAINT "team_payment_team_plan_type_fkey" FOREIGN KEY ("team_plan_type") REFERENCES "team_plan"("type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment" ADD CONSTRAINT "team_payment_user_payment_info_id_fkey" FOREIGN KEY ("user_payment_info_id") REFERENCES "user_payment_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;
