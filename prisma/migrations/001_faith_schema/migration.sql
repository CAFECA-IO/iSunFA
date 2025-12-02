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
ALTER TABLE "team_invoice" ALTER COLUMN "issued_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_payment" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_payment_transaction" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_subscription" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- CreateTable
CREATE TABLE "faith_session" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "faith_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faith_content" (
    "id" SERIAL NOT NULL,
    "faith_session_id" INTEGER NOT NULL,
    "role_id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "role_image" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "faith_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faith_certificate" (
    "id" SERIAL NOT NULL,
    "faith_session_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "faith_certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faith_certificate_tax" (
    "id" SERIAL NOT NULL,
    "faith_certificate_id" INTEGER NOT NULL,
    "invoice_no" TEXT,
    "issue_date" INTEGER,
    "trading_partner_name" TEXT,
    "trading_partner_tax_id" TEXT,
    "tax_type" TEXT,
    "tax_rate" DECIMAL(26,8),
    "sales_amount" DECIMAL(26,8),
    "tax" DECIMAL(26,8),

    CONSTRAINT "faith_certificate_tax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faith_certificate_voucher" (
    "id" SERIAL NOT NULL,
    "faith_certificate_id" INTEGER NOT NULL,
    "voucher_type" TEXT NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "issue_date" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "faith_certificate_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faith_certificate_voucher_line_item" (
    "id" SERIAL NOT NULL,
    "faith_certificate_voucher_id" INTEGER NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "debit" BOOLEAN NOT NULL,
    "amount" DECIMAL(26,8) NOT NULL,

    CONSTRAINT "faith_certificate_voucher_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faith_share" (
    "id" SERIAL NOT NULL,
    "faith_session_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "views" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "faith_share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faith_like" (
    "id" SERIAL NOT NULL,
    "faith_content_id" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,

    CONSTRAINT "faith_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faith_dislike" (
    "id" SERIAL NOT NULL,
    "faith_content_id" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,

    CONSTRAINT "faith_dislike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faith_like_faith_content_id_userId_key" ON "faith_like"("faith_content_id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "faith_dislike_faith_content_id_userId_key" ON "faith_dislike"("faith_content_id", "userId");

-- AddForeignKey
ALTER TABLE "faith_content" ADD CONSTRAINT "faith_content_faith_session_id_fkey" FOREIGN KEY ("faith_session_id") REFERENCES "faith_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faith_certificate" ADD CONSTRAINT "faith_certificate_faith_session_id_fkey" FOREIGN KEY ("faith_session_id") REFERENCES "faith_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faith_certificate_tax" ADD CONSTRAINT "faith_certificate_tax_faith_certificate_id_fkey" FOREIGN KEY ("faith_certificate_id") REFERENCES "faith_certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faith_certificate_voucher" ADD CONSTRAINT "faith_certificate_voucher_faith_certificate_id_fkey" FOREIGN KEY ("faith_certificate_id") REFERENCES "faith_certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faith_certificate_voucher_line_item" ADD CONSTRAINT "faith_certificate_voucher_line_item_faith_certificate_vouc_fkey" FOREIGN KEY ("faith_certificate_voucher_id") REFERENCES "faith_certificate_voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faith_like" ADD CONSTRAINT "faith_like_faith_content_id_fkey" FOREIGN KEY ("faith_content_id") REFERENCES "faith_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faith_dislike" ADD CONSTRAINT "faith_dislike_faith_content_id_fkey" FOREIGN KEY ("faith_content_id") REFERENCES "faith_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
