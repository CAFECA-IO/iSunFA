-- CreateEnum
CREATE TYPE "TPlanType" AS ENUM ('BEGINNER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "t_plan" (
    "id" SERIAL NOT NULL,
    "type" "TPlanType" NOT NULL,
    "plan_name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "extra_member_price" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_plan_feature" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "feature_key" TEXT NOT NULL,
    "feature_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_plan_feature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "t_plan_type_key" ON "t_plan"("type");

-- AddForeignKey
ALTER TABLE "t_plan_feature" ADD CONSTRAINT "t_plan_feature_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "t_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
