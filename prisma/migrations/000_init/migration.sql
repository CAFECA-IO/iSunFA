-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PERSONAL', 'COMPANY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "pub_key_x" TEXT,
    "pub_key_y" TEXT,
    "credential_id" TEXT,
    "current_challenge" TEXT,
    "name" TEXT,
    "image_url" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PERSONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "User_credential_id_key" ON "User"("credential_id");

-- CreateIndex
CREATE INDEX "User_address_idx" ON "User"("address");
