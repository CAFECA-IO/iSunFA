-- CreateEnum
CREATE TYPE "Tag" AS ENUM ('ALL', 'FINANCIAL', 'TAX');

-- CreateEnum
CREATE TYPE "FilingFrequency" AS ENUM ('BIMONTHLY_FILING', 'MONTHLY_FILING');

-- CreateEnum
CREATE TYPE "FilingMethod" AS ENUM ('SINGLE_ENTITY_FILING', 'CONSOLIDATED_FILING', 'INDIVIDUAL_FILING');

-- CreateEnum
CREATE TYPE "DeclarantFilingMethod" AS ENUM ('SELF_FILING', 'AGENT_FILING');

-- CreateEnum
CREATE TYPE "AgentFilingRole" AS ENUM ('ACCOUNTANT', 'BOOKKEEPER', 'BOOKKEEPER_AND_FILING_AGENT');

-- CreateEnum
CREATE TYPE "DeductionType" AS ENUM ('DEDUCTIBLE_PURCHASE_AND_EXPENSE', 'DEDUCTIBLE_FIXED_ASSETS', 'NON_DEDUCTIBLE_PURCHASE_AND_EXPENSE', 'NON_DEDUCTIBLE_FIXED_ASSETS');

-- CreateEnum
CREATE TYPE "InvoiceDirection" AS ENUM ('INPUT', 'OUTPUT');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('INPUT_20', 'INPUT_21', 'INPUT_22', 'INPUT_23', 'INPUT_24', 'INPUT_25', 'INPUT_26', 'INPUT_27', 'INPUT_28', 'INPUT_29', 'OUTPUT_30', 'OUTPUT_31', 'OUTPUT_32', 'OUTPUT_33', 'OUTPUT_34', 'OUTPUT_35', 'OUTPUT_36');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('TWD', 'EUR');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('TAXABLE', 'TAX_FREE');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('INDIVIDUAL', 'ACCOUNTING_FIRMS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('SYSTEM', 'COMPANY', 'USER');

-- CreateEnum
CREATE TYPE "TeamPlanType" AS ENUM ('TRIAL', 'BEGINNER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'COMPLETED', 'DECLINED', 'CANCELED', 'FAILED');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('IN_TEAM', 'NOT_IN_TEAM');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED', 'DECLINED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'INVITATION', 'ACCOUNT_BOOK', 'INVOICE', 'VOUCHER', 'PAYMENT', 'SUBSCRIPTION', 'TEAM_MEMBER', 'TEAM_INVITATION');

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

-- CreateTable
CREATE TABLE "account" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 0,
    "system" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "debit" BOOLEAN NOT NULL,
    "liquidity" BOOLEAN NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "for_user" BOOLEAN NOT NULL,
    "parent_code" TEXT NOT NULL,
    "root_code" TEXT NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "root_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" INTEGER,
    "note" TEXT,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "acquisition_date" INTEGER NOT NULL,
    "purchase_price" DOUBLE PRECISION NOT NULL,
    "residual_value" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "depreciation_start" INTEGER NOT NULL,
    "depreciation_method" TEXT NOT NULL,
    "useful_life" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_voucher" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "asset_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_report" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "information_year" TEXT NOT NULL,
    "credit_rating" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "report_id" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "audit_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authentication" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "credential_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "auth_data" JSONB NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "authentication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_setting" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "sales_tax_taxable" BOOLEAN NOT NULL,
    "sales_tax_rate" DOUBLE PRECISION NOT NULL,
    "purchase_tax_taxable" BOOLEAN NOT NULL,
    "purchase_tax_rate" DOUBLE PRECISION NOT NULL,
    "return_periodicity" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL DEFAULT 0,
    "updated_at" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" INTEGER,

    CONSTRAINT "accounting_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associate_line_item" (
    "id" SERIAL NOT NULL,
    "associate_voucher_id" INTEGER NOT NULL,
    "original_line_item_id" INTEGER NOT NULL,
    "result_line_item_id" INTEGER NOT NULL,
    "debit" BOOLEAN NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "associate_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associate_voucher" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "original_voucher_id" INTEGER NOT NULL,
    "result_voucher_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "associate_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparty" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "counterparty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locale_key" TEXT NOT NULL,
    "phone_code" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL,
    "currency_name" TEXT NOT NULL,
    "phone_example" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,
    "image_file_id" INTEGER NOT NULL,
    "start_date" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,
    "is_private" BOOLEAN NOT NULL DEFAULT true,
    "is_transferring" BOOLEAN NOT NULL DEFAULT false,
    "tag" "Tag" NOT NULL DEFAULT 'ALL',

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_kyc" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "representative_name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "registration_date" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "registration_certificate_file_id" INTEGER NOT NULL,
    "tax_certificate_file_id" INTEGER NOT NULL,
    "representative_id_type" TEXT NOT NULL,
    "representative_id_card_file_id" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "structure" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewer" TEXT,
    "note" TEXT,
    "review_at" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "company_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_setting" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "tax_serial_number" TEXT NOT NULL,
    "representative_name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" JSONB NOT NULL DEFAULT '{"city": "", "district": "", "enteredAddress": ""}',
    "country_code" TEXT NOT NULL DEFAULT 'tw',
    "contact_person" TEXT,
    "filing_frequency" "FilingFrequency",
    "filing_method" "FilingMethod",
    "declarant_filing_method" "DeclarantFilingMethod",
    "declarant_name" TEXT,
    "declarant_personal_id" TEXT,
    "declarant_phone_number" TEXT,
    "agent_filing_role" "AgentFilingRole",
    "license_id" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "company_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract" (
    "id" SERIAL NOT NULL,
    "file_url" TEXT NOT NULL,
    "project_id" INTEGER,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "signatory" TEXT NOT NULL,
    "signatory_date" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "has_contract_date" BOOLEAN NOT NULL,
    "contract_start_date" INTEGER,
    "contract_end_date" INTEGER,
    "has_deadline_date" BOOLEAN NOT NULL,
    "deadline_date" INTEGER,
    "has_warranty_date" BOOLEAN NOT NULL,
    "warranty_start_date" INTEGER,
    "warranty_end_date" INTEGER,
    "service_type" TEXT NOT NULL,
    "estimated_cost" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate" (
    "id" SERIAL NOT NULL,
    "ai_result_id" TEXT NOT NULL DEFAULT '0',
    "company_id" INTEGER NOT NULL,
    "file_id" INTEGER NOT NULL,
    "uploader_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_rc2" (
    "id" SERIAL NOT NULL,
    "accountbook_id" INTEGER NOT NULL,
    "voucher_id" INTEGER,
    "file_id" INTEGER NOT NULL,
    "uploader_id" INTEGER NOT NULL,
    "direction" "InvoiceDirection" NOT NULL,
    "ai_result_id" TEXT DEFAULT '0',
    "ai_status" TEXT DEFAULT 'READY',
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,
    "type" "InvoiceType",
    "issued_date" INTEGER,
    "no" TEXT,
    "currency_code" "CurrencyCode" NOT NULL,
    "tax_type" "TaxType",
    "tax_rate" INTEGER,
    "net_amount" INTEGER,
    "tax_amount" INTEGER,
    "total_amount" INTEGER,
    "is_generated" BOOLEAN NOT NULL DEFAULT false,
    "incomplete" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "note" JSONB,
    "deduction_type" "DeductionType",
    "sales_name" TEXT,
    "sales_id_number" TEXT,
    "is_shared_amount" BOOLEAN DEFAULT false,
    "buyer_name" TEXT,
    "buyer_id_number" TEXT,
    "return_or_allowance" BOOLEAN DEFAULT false,
    "total_of_summarized_invoices" INTEGER,
    "carrier_serial_number" TEXT,
    "other_certificate_no" TEXT,

    CONSTRAINT "invoice_rc2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image_id" TEXT,
    "department_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "salary" INTEGER NOT NULL,
    "insurance_payment" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL,
    "salary_pay_mode" TEXT NOT NULL,
    "pay_frequency" TEXT NOT NULL,
    "start_date" INTEGER NOT NULL,
    "end_date" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_project" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "start_date" INTEGER NOT NULL,
    "end_date" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "employee_project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" SERIAL NOT NULL,
    "event_type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "start_date" INTEGER NOT NULL,
    "end_date" INTEGER NOT NULL,
    "daysOfWeek" INTEGER[],
    "monthsOfYear" INTEGER[],
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "mime_type" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_encrypted" BOOLEAN NOT NULL,
    "encrypted_symmetric_key" TEXT NOT NULL,
    "iv" BYTEA NOT NULL DEFAULT '\x',
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,
    "thumbnail_id" INTEGER,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" SERIAL NOT NULL,
    "certificate_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Invoice 001',
    "counter_party_info" TEXT,
    "input_or_output" TEXT NOT NULL,
    "date" INTEGER NOT NULL,
    "no" TEXT NOT NULL,
    "currency_alias" TEXT NOT NULL,
    "price_before_tax" INTEGER NOT NULL,
    "tax_type" TEXT NOT NULL,
    "tax_ratio" INTEGER NOT NULL,
    "tax_price" INTEGER NOT NULL,
    "total_price" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "deductible" BOOLEAN NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_voucher_journal" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER,
    "voucher_id" INTEGER,
    "journal_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "payment_id" INTEGER,
    "payment_reason" TEXT NOT NULL,
    "vendor_or_supplier" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "invoice_voucher_journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_expense" (
    "id" SERIAL NOT NULL,
    "income" INTEGER NOT NULL,
    "expense" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "project_id" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "income_expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal" (
    "id" SERIAL NOT NULL,
    "token_contract" TEXT,
    "token_id" TEXT,
    "aich_result_id" TEXT,
    "project_id" INTEGER,
    "contract_id" INTEGER,
    "company_id" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_role" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "birth_date" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "qualification" BOOLEAN NOT NULL,
    "start_date_of_practice" INTEGER NOT NULL,
    "certification_number" TEXT NOT NULL,
    "association" TEXT NOT NULL,
    "membership_number" TEXT NOT NULL,
    "personal_id_type" TEXT NOT NULL,
    "personal_id_file_id" INTEGER NOT NULL,
    "certification_file_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "kyc_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_item" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "debit" BOOLEAN NOT NULL,
    "account_id" INTEGER NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "start_date" INTEGER,
    "end_date" INTEGER,
    "status" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" SERIAL NOT NULL,
    "image_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr" (
    "id" SERIAL NOT NULL,
    "aich_result_id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "image_file_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "ocr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "detail" JSONB,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "completed_percent" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "image_file_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" SERIAL NOT NULL,
    "is_revenue" BOOLEAN NOT NULL,
    "price" INTEGER NOT NULL,
    "has_tax" BOOLEAN NOT NULL,
    "tax_percentage" INTEGER NOT NULL,
    "tax_price" INTEGER NOT NULL,
    "has_fee" BOOLEAN NOT NULL,
    "fee" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "installment_period" INTEGER NOT NULL,
    "already_paid" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_record" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "card_issuer_country" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payment_created_at" TEXT NOT NULL,
    "refund_amount" DOUBLE PRECISION NOT NULL,
    "auth_code" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "payment_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "billing_cycle" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "token_contract" TEXT,
    "token_id" TEXT,
    "name" TEXT NOT NULL,
    "from" INTEGER NOT NULL,
    "to" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "remaining_seconds" INTEGER,
    "paused" BOOLEAN,
    "project_id" INTEGER,
    "report_link" TEXT,
    "download_link" TEXT,
    "block_chain_explorer_link" TEXT,
    "evidence_id" TEXT,
    "content" JSONB NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "auto_renewal" BOOLEAN NOT NULL,
    "status" BOOLEAN NOT NULL,
    "start_date" INTEGER NOT NULL,
    "expired_date" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "total_sales" INTEGER NOT NULL,
    "comparison" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_record" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "start_date" INTEGER NOT NULL,
    "end_date" INTEGER NOT NULL,
    "salary" INTEGER NOT NULL,
    "insurance_payment" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "working_hour" INTEGER NOT NULL,
    "confirmed" BOOLEAN NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "salary_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_record_project_hour" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "salary_record_id" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "salary_record_project_hour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortcut" (
    "id" SERIAL NOT NULL,
    "accounting_setting_id" INTEGER NOT NULL,
    "action_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "field_list" JSONB NOT NULL,
    "key_list" TEXT[],
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "shortcut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todo" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "deadline" INTEGER NOT NULL,
    "note" TEXT,
    "status" BOOLEAN NOT NULL,
    "start_date" INTEGER NOT NULL DEFAULT 0,
    "end_date" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "todo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "image_File_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_agreement" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "agreement_hash" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_action_log" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,
    "action_description" TEXT NOT NULL,
    "action_time" INTEGER NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "api_endpoint" TEXT NOT NULL,
    "http_method" TEXT NOT NULL,
    "request_payload" JSONB NOT NULL,
    "http_status_code" INTEGER NOT NULL,
    "status_message" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL DEFAULT 0,
    "updated_at" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" INTEGER DEFAULT 0,

    CONSTRAINT "user_action_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_payment_info" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "default" BOOLEAN NOT NULL DEFAULT false,
    "detail" JSONB,
    "transaction_id" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_payment_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_setting" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "country_id" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "phone" TEXT,
    "system_notification" BOOLEAN NOT NULL,
    "update_and_subscription_notification" BOOLEAN NOT NULL,
    "email_notification" BOOLEAN NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_name" "RoleName" NOT NULL,
    "type" "RoleType" NOT NULL,
    "last_login_at" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_feature" (
    "id" SERIAL NOT NULL,
    "role_name" "RoleName" NOT NULL,
    "feature_key" TEXT NOT NULL,
    "feature_value" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "role_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_todo_company" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "todo_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "user_todo_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher" (
    "id" SERIAL NOT NULL,
    "issuer_id" INTEGER NOT NULL,
    "counter_party_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "ai_result_id" TEXT NOT NULL DEFAULT '0',
    "status" TEXT NOT NULL DEFAULT 'journal:JOURNAL.UPLOADED',
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "no" TEXT NOT NULL,
    "date" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'payment',
    "note" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_certificate" (
    "id" SERIAL NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "certificate_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "voucher_certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_salary_record" (
    "id" SERIAL NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "salary_record_id" INTEGER NOT NULL,
    "voucher_salary_record_folder_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "voucher_salary_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_salary_record_folder" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "voucher_salary_record_folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "value" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "total_revenue" INTEGER NOT NULL,
    "total_revenue_growth_in_30d" INTEGER NOT NULL,
    "total_expense" INTEGER NOT NULL,
    "net_profit" INTEGER NOT NULL,
    "net_profit_growth_in_30d" INTEGER NOT NULL,
    "net_profit_growth_in_year" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_rate" (
    "id" SERIAL NOT NULL,
    "employee_project_id" INTEGER NOT NULL,
    "involvement_rate" INTEGER,
    "expected_hours" INTEGER NOT NULL,
    "actual_hours" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "work_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_plan" (
    "id" SERIAL NOT NULL,
    "type" "TeamPlanType" NOT NULL,
    "plan_name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "extra_member_price" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "team_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_plan_feature" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "feature_key" TEXT NOT NULL,
    "feature_value" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "team_plan_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "image_file_id" INTEGER,
    "about" TEXT NOT NULL DEFAULT '',
    "profile" TEXT NOT NULL DEFAULT '',
    "bank_info" JSONB NOT NULL DEFAULT '{"code": "", "number": ""}',
    "created_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "updated_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_team_member" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "updated_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "pending_at" INTEGER,
    "completed_at" INTEGER,
    "declined_at" INTEGER,
    "canceled_at" INTEGER,
    "note" JSONB DEFAULT '{}',

    CONSTRAINT "invite_team_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "TeamRole" NOT NULL,
    "joined_at" INTEGER NOT NULL,
    "left_at" INTEGER,
    "status" "LeaveStatus" NOT NULL DEFAULT 'IN_TEAM',

    CONSTRAINT "team_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_subscription" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "plan_type" "TeamPlanType" NOT NULL DEFAULT 'TRIAL',
    "max_members" INTEGER NOT NULL DEFAULT 3,
    "start_date" INTEGER NOT NULL,
    "expired_date" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "updated_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,

    CONSTRAINT "team_subscription_pkey" PRIMARY KEY ("id")
);

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

    CONSTRAINT "team_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_payment_transaction" (
    "id" SERIAL NOT NULL,
    "team_order_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "payment_gateway" TEXT NOT NULL,
    "user_payment_info_id" INTEGER NOT NULL,
    "payment_getway_record_id" TEXT,
    "status" "TransactionStatus" NOT NULL,
    "created_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "updated_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,

    CONSTRAINT "team_payment_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invoice" (
    "id" SERIAL NOT NULL,
    "team_order_id" INTEGER NOT NULL,
    "team_payment_transaction_id" INTEGER NOT NULL,
    "invoice_code" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "payer_id" TEXT,
    "payer_name" TEXT,
    "payer_email" TEXT,
    "payer_address" TEXT,
    "payer_phone" TEXT,
    "status" TEXT NOT NULL,
    "issued_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "created_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,
    "updated_at" INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::int,

    CONSTRAINT "team_invoice_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "email_login" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expired_at" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "email_login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "team_id" INTEGER,
    "type" "NotificationType" NOT NULL,
    "event" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "image_url" TEXT,
    "action_url" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "authentication_credential_id_key" ON "authentication"("credential_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_image_file_id_key" ON "company"("image_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_kyc_registration_certificate_file_id_key" ON "company_kyc"("registration_certificate_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_kyc_tax_certificate_file_id_key" ON "company_kyc"("tax_certificate_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_kyc_representative_id_card_file_id_key" ON "company_kyc"("representative_id_card_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_setting_company_id_key" ON "company_setting"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_payment_id_key" ON "contract"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_file_id_key" ON "certificate"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_aich_result_id_key" ON "journal"("aich_result_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_project_id_key" ON "journal"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_contract_id_key" ON "journal"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_role_personal_id_file_id_key" ON "kyc_role"("personal_id_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_role_certification_file_id_key" ON "kyc_role"("certification_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_aich_result_id_key" ON "ocr"("aich_result_id");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_image_file_id_key" ON "ocr"("image_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_image_file_id_key" ON "project"("image_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_name_key" ON "plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_image_File_id_key" ON "user"("image_File_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_agreement_user_id_agreement_hash_key" ON "user_agreement"("user_id", "agreement_hash");

-- CreateIndex
CREATE UNIQUE INDEX "value_project_id_key" ON "value"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_plan_type_key" ON "team_plan"("type");

-- CreateIndex
CREATE UNIQUE INDEX "team_image_file_id_key" ON "team"("image_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_team_member_email_key" ON "invite_team_member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_team_id_user_id_key" ON "team_member"("team_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_payment_team_id_key" ON "team_payment"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "resume_attachment_file_id_key" ON "resume"("attachment_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "resume_certificate_skills_file_id_key" ON "resume_certificate_skills"("file_id");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_root_id_fkey" FOREIGN KEY ("root_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_created_user_id_fkey" FOREIGN KEY ("created_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_voucher" ADD CONSTRAINT "asset_voucher_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_voucher" ADD CONSTRAINT "asset_voucher_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_report" ADD CONSTRAINT "audit_report_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_report" ADD CONSTRAINT "audit_report_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authentication" ADD CONSTRAINT "authentication_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_setting" ADD CONSTRAINT "accounting_setting_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_line_item" ADD CONSTRAINT "associate_line_item_associate_voucher_id_fkey" FOREIGN KEY ("associate_voucher_id") REFERENCES "associate_voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_line_item" ADD CONSTRAINT "associate_line_item_original_line_item_id_fkey" FOREIGN KEY ("original_line_item_id") REFERENCES "line_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_line_item" ADD CONSTRAINT "associate_line_item_result_line_item_id_fkey" FOREIGN KEY ("result_line_item_id") REFERENCES "line_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_voucher" ADD CONSTRAINT "associate_voucher_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_voucher" ADD CONSTRAINT "associate_voucher_original_voucher_id_fkey" FOREIGN KEY ("original_voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_voucher" ADD CONSTRAINT "associate_voucher_result_voucher_id_fkey" FOREIGN KEY ("result_voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty" ADD CONSTRAINT "counterparty_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_kyc" ADD CONSTRAINT "company_kyc_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_kyc" ADD CONSTRAINT "company_kyc_registration_certificate_file_id_fkey" FOREIGN KEY ("registration_certificate_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_kyc" ADD CONSTRAINT "company_kyc_tax_certificate_file_id_fkey" FOREIGN KEY ("tax_certificate_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_kyc" ADD CONSTRAINT "company_kyc_representative_id_card_file_id_fkey" FOREIGN KEY ("representative_id_card_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_setting" ADD CONSTRAINT "company_setting_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_rc2" ADD CONSTRAINT "invoice_rc2_accountbook_id_fkey" FOREIGN KEY ("accountbook_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_rc2" ADD CONSTRAINT "invoice_rc2_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_rc2" ADD CONSTRAINT "invoice_rc2_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_rc2" ADD CONSTRAINT "invoice_rc2_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_project" ADD CONSTRAINT "employee_project_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_project" ADD CONSTRAINT "employee_project_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_thumbnail_id_fkey" FOREIGN KEY ("thumbnail_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_voucher_journal" ADD CONSTRAINT "invoice_voucher_journal_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_voucher_journal" ADD CONSTRAINT "invoice_voucher_journal_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_voucher_journal" ADD CONSTRAINT "invoice_voucher_journal_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_expense" ADD CONSTRAINT "income_expense_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_expense" ADD CONSTRAINT "income_expense_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal" ADD CONSTRAINT "journal_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal" ADD CONSTRAINT "journal_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal" ADD CONSTRAINT "journal_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_role" ADD CONSTRAINT "kyc_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_role" ADD CONSTRAINT "kyc_role_personal_id_file_id_fkey" FOREIGN KEY ("personal_id_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_role" ADD CONSTRAINT "kyc_role_certification_file_id_fkey" FOREIGN KEY ("certification_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_item" ADD CONSTRAINT "line_item_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_item" ADD CONSTRAINT "line_item_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr" ADD CONSTRAINT "ocr_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr" ADD CONSTRAINT "ocr_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_record" ADD CONSTRAINT "payment_record_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_record" ADD CONSTRAINT "salary_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortcut" ADD CONSTRAINT "shortcut_accounting_setting_id_fkey" FOREIGN KEY ("accounting_setting_id") REFERENCES "accounting_setting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_image_File_id_fkey" FOREIGN KEY ("image_File_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agreement" ADD CONSTRAINT "user_agreement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_action_log" ADD CONSTRAINT "user_action_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_payment_info" ADD CONSTRAINT "user_payment_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_todo_company" ADD CONSTRAINT "user_todo_company_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_todo_company" ADD CONSTRAINT "user_todo_company_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_todo_company" ADD CONSTRAINT "user_todo_company_todo_id_fkey" FOREIGN KEY ("todo_id") REFERENCES "todo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_counter_party_id_fkey" FOREIGN KEY ("counter_party_id") REFERENCES "counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_certificate" ADD CONSTRAINT "voucher_certificate_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_certificate" ADD CONSTRAINT "voucher_certificate_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_salary_record" ADD CONSTRAINT "voucher_salary_record_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_salary_record" ADD CONSTRAINT "voucher_salary_record_salary_record_id_fkey" FOREIGN KEY ("salary_record_id") REFERENCES "salary_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_salary_record" ADD CONSTRAINT "voucher_salary_record_voucher_salary_record_folder_id_fkey" FOREIGN KEY ("voucher_salary_record_folder_id") REFERENCES "voucher_salary_record_folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_salary_record_folder" ADD CONSTRAINT "voucher_salary_record_folder_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value" ADD CONSTRAINT "value_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_rate" ADD CONSTRAINT "work_rate_employee_project_id_fkey" FOREIGN KEY ("employee_project_id") REFERENCES "employee_project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_plan_feature" ADD CONSTRAINT "team_plan_feature_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "team_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_team_member" ADD CONSTRAINT "invite_team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_subscription" ADD CONSTRAINT "team_subscription_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_subscription" ADD CONSTRAINT "team_subscription_plan_type_fkey" FOREIGN KEY ("plan_type") REFERENCES "team_plan"("type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_order" ADD CONSTRAINT "team_order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_order" ADD CONSTRAINT "team_order_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_order_detail" ADD CONSTRAINT "team_order_detail_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "team_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment" ADD CONSTRAINT "team_payment_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment" ADD CONSTRAINT "team_payment_team_plan_type_fkey" FOREIGN KEY ("team_plan_type") REFERENCES "team_plan"("type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment" ADD CONSTRAINT "team_payment_user_payment_info_id_fkey" FOREIGN KEY ("user_payment_info_id") REFERENCES "user_payment_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment_transaction" ADD CONSTRAINT "team_payment_transaction_team_order_id_fkey" FOREIGN KEY ("team_order_id") REFERENCES "team_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_payment_transaction" ADD CONSTRAINT "team_payment_transaction_user_payment_info_id_fkey" FOREIGN KEY ("user_payment_info_id") REFERENCES "user_payment_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invoice" ADD CONSTRAINT "team_invoice_team_order_id_fkey" FOREIGN KEY ("team_order_id") REFERENCES "team_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invoice" ADD CONSTRAINT "team_invoice_team_payment_transaction_id_fkey" FOREIGN KEY ("team_payment_transaction_id") REFERENCES "team_payment_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountBook_transfer" ADD CONSTRAINT "accountBook_transfer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountBook_transfer" ADD CONSTRAINT "accountBook_transfer_from_team_id_fkey" FOREIGN KEY ("from_team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountBook_transfer" ADD CONSTRAINT "accountBook_transfer_to_team_id_fkey" FOREIGN KEY ("to_team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountBook_transfer" ADD CONSTRAINT "accountBook_transfer_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- Alter Sequence to Start from 10000000
ALTER SEQUENCE "account_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "asset_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "asset_voucher_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "audit_report_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "authentication_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "accounting_setting_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "associate_line_item_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "associate_voucher_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "counterparty_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "country_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "company_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "company_kyc_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "company_setting_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "contract_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "certificate_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "invoice_rc2_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "department_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "employee_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "employee_project_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "event_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "file_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "invoice_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "invoice_voucher_journal_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "income_expense_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "journal_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "kyc_role_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "line_item_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "milestone_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "news_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "ocr_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "order_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "project_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "payment_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "payment_record_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "plan_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "report_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "subscription_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "sale_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "salary_record_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "salary_record_project_hour_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "shortcut_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "todo_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_agreement_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_action_log_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_payment_info_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_setting_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_role_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "role_feature_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_todo_company_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "voucher_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "voucher_certificate_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "voucher_salary_record_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "voucher_salary_record_folder_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "value_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "work_rate_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "team_plan_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "team_plan_feature_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "team_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "invite_team_member_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "team_member_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "team_subscription_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "team_order_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "team_order_detail_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "team_payment_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "team_payment_transaction_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "team_invoice_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "accountBook_transfer_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "email_job_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "email_login_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "notification_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "job_posting_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "job_posting_detail_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "resume_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "resume_education_experiences_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "resume_work_experiences_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "resume_language_skills_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "resume_certificate_skills_id_seq" RESTART WITH 10000000;
