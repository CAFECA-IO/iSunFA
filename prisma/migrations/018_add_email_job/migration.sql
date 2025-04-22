-- CreateTable
CREATE TABLE "email_job" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "retry" INTEGER NOT NULL DEFAULT 0,
    "max_retry" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "email_job_pkey" PRIMARY KEY ("id")
);
