-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('IN_TEAM', 'NOT_IN_TEAM');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED', 'DECLINED', 'FAILED');

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "is_transferring" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pending_team_member" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_invoice" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_member" ADD COLUMN     "left_at" INTEGER,
ADD COLUMN     "status" "LeaveStatus" NOT NULL DEFAULT 'IN_TEAM';

-- AlterTable
ALTER TABLE "team_payment_transaction" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_subscription" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- CreateTable
CREATE TABLE "accountBook_transfer" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "from_team_id" INTEGER NOT NULL,
    "to_team_id" INTEGER NOT NULL,
    "initiated_by_user_id" INTEGER NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "pending_at" INTEGER,
    "completed_at" INTEGER,
    "canceled_at" INTEGER,
    "updated_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "note" JSONB DEFAULT '{}',

    CONSTRAINT "accountBook_transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accountBook_transfer_from_team_id_to_team_id_key" ON "accountBook_transfer"("from_team_id", "to_team_id");

-- AddForeignKey
ALTER TABLE "accountBook_transfer" ADD CONSTRAINT "accountBook_transfer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountBook_transfer" ADD CONSTRAINT "accountBook_transfer_from_team_id_fkey" FOREIGN KEY ("from_team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountBook_transfer" ADD CONSTRAINT "accountBook_transfer_to_team_id_fkey" FOREIGN KEY ("to_team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountBook_transfer" ADD CONSTRAINT "accountBook_transfer_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
