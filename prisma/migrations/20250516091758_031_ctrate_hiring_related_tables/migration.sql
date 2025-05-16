-- CreateEnum
CREATE TYPE "JobDetailType" AS ENUM ('RESPONSIBILITY', 'REQUIREMENT', 'EXTRA_SKILL');

-- CreateEnum
CREATE TYPE "JobDiscoverySource" AS ENUM ('FROM104', 'FACEBOOK', 'LINKEDIN', 'OFFCIAL_WEBSITE', 'OTHERS');

-- CreateEnum
CREATE TYPE "Degree" AS ENUM ('ELEMENTARY', 'JUNIOR', 'HIGH', 'BACHELOR', 'MASTER', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('GRADUATED', 'IN_SCHOOL', 'DROPOUT');

-- CreateEnum
CREATE TYPE "Proficiency" AS ENUM ('ELEMENTARY', 'LIMITED', 'PROFESSIONAL', 'NATIVE');

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
ALTER TABLE "team_payment" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_payment_transaction" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- AlterTable
ALTER TABLE "team_subscription" ALTER COLUMN "created_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int,
ALTER COLUMN "updated_at" SET DEFAULT EXTRACT(EPOCH FROM NOW())::int;

-- CreateTable
CREATE TABLE "job_posting" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "issued_at" INTEGER NOT NULL,

    CONSTRAINT "job_posting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_posting_detail" (
    "id" SERIAL NOT NULL,
    "job_posting_id" INTEGER NOT NULL,
    "job_detail_type" "JobDetailType" NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "job_posting_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "is_related_company" BOOLEAN NOT NULL,
    "is_working_i_sun_cloud" BOOLEAN NOT NULL,
    "has_criminal_record" BOOLEAN NOT NULL,
    "where_learn_about_job" "JobDiscoverySource" NOT NULL,
    "preferred_employment_types" TEXT[],
    "preferred_shifts" TEXT[],
    "preferred_location_types" TEXT[],
    "preferred_start_date" TEXT NOT NULL,
    "preferred_salary_expectation" TEXT NOT NULL,
    "attachment_file_id" INTEGER,
    "personal_website_url" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_education_experiences" (
    "id" SERIAL NOT NULL,
    "resume_id" INTEGER NOT NULL,
    "degree" "Degree" NOT NULL,
    "school_name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "start_date" INTEGER NOT NULL,
    "end_date" INTEGER NOT NULL,
    "status" "SchoolStatus" NOT NULL,

    CONSTRAINT "resume_education_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_work_experiences" (
    "id" SERIAL NOT NULL,
    "resume_id" INTEGER NOT NULL,
    "company_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "start_date" INTEGER NOT NULL,
    "end_date" INTEGER NOT NULL,
    "description" TEXT,
    "leaving_reason" TEXT,

    CONSTRAINT "resume_work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_language_skills" (
    "id" SERIAL NOT NULL,
    "resume_id" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "proficiency" "Proficiency" NOT NULL,

    CONSTRAINT "resume_language_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_certificate_skills" (
    "id" SERIAL NOT NULL,
    "resume_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "issuing_organization" TEXT NOT NULL,
    "issue_date" INTEGER NOT NULL,
    "expiration_date" INTEGER NOT NULL,
    "file_id" INTEGER NOT NULL,

    CONSTRAINT "resume_certificate_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resume_attachment_file_id_key" ON "resume"("attachment_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "resume_certificate_skills_file_id_key" ON "resume_certificate_skills"("file_id");

-- AddForeignKey
ALTER TABLE "job_posting_detail" ADD CONSTRAINT "job_posting_detail_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_posting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume" ADD CONSTRAINT "resume_attachment_file_id_fkey" FOREIGN KEY ("attachment_file_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_education_experiences" ADD CONSTRAINT "resume_education_experiences_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_work_experiences" ADD CONSTRAINT "resume_work_experiences_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_language_skills" ADD CONSTRAINT "resume_language_skills_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_certificate_skills" ADD CONSTRAINT "resume_certificate_skills_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_certificate_skills" ADD CONSTRAINT "resume_certificate_skills_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
