-- CreateTable
CREATE TABLE "external_user" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "external_id" TEXT NOT NULL,
    "external_provider" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "external_user_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "external_user" ADD CONSTRAINT "external_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
