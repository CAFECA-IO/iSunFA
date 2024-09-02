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
    "level" INTEGER NOT NULL DEFAULT 0,
    "parent_code" TEXT NOT NULL,
    "root_code" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset" (
    "id" SERIAL NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "project_id" INTEGER,
    "contract_id" INTEGER,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "residual_value" TEXT NOT NULL,
    "estimate_useful_life" TEXT NOT NULL,
    "depreciation_method" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "admin" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL,
    "start_date" INTEGER NOT NULL,
    "end_date" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "client" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,
    "favorite" BOOLEAN NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "regional" TEXT NOT NULL,
    "kyc_status" BOOLEAN NOT NULL,
    "image_file_id" INTEGER,
    "start_date" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

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
    "registration_certificate_id" TEXT NOT NULL,
    "registration_certificate_file_id" INTEGER NOT NULL,
    "representative_id_card_file_id" INTEGER NOT NULL,
    "tax_certificate_file_id" INTEGER NOT NULL,
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
    "auto_renewal" BOOLEAN NOT NULL,
    "notify_timing" INTEGER NOT NULL,
    "notify_channel" TEXT NOT NULL,
    "reminder_freq" INTEGER NOT NULL,
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
CREATE TABLE "file" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "mime_type" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_encrypted" BOOLEAN NOT NULL,
    "encryptedSymmetricKey" TEXT NOT NULL,
    "iv" BYTEA NOT NULL DEFAULT '\x',
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" SERIAL NOT NULL,
    "journal_id" INTEGER NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "vendor_tax_id" TEXT NOT NULL,
    "date" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "payment_reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "vendor_or_supplier" TEXT NOT NULL,
    "deductible" BOOLEAN NOT NULL,
    "image_file_id" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "created_user_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "has_used" BOOLEAN NOT NULL,
    "expired_at" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
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
    "event" TEXT NOT NULL,
    "project_id" INTEGER,
    "contract_id" INTEGER,
    "company_id" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,
    CONSTRAINT "journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_item" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
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
    "company_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
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
    "image_id" INTEGER,
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
    "date" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
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
    "monthly_fee" INTEGER NOT NULL,
    "annual_fee" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
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
    "company_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
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
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "image_File_id" INTEGER,
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
CREATE TABLE "voucher" (
    "id" SERIAL NOT NULL,
    "journal_id" INTEGER NOT NULL,
    "no" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "deleted_at" INTEGER,

    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
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
    "name" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "account_code_key" ON "account"("code");

-- CreateIndex
CREATE UNIQUE INDEX "authentication_credential_id_key" ON "authentication"("credential_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_code_key" ON "company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "contract_payment_id_key" ON "contract"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_journal_id_key" ON "invoice"("journal_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_payment_id_key" ON "invoice"("payment_id");

CREATE UNIQUE INDEX "invoice_number_key" ON "invoice"("number");
-- CreateIndex
CREATE UNIQUE INDEX "invitation_code_key" ON "invitation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "journal_aich_result_id_key" ON "journal"("aich_result_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_project_id_key" ON "journal"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_contract_id_key" ON "journal"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_aich_result_id_key" ON "ocr"("aich_result_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_name_key" ON "plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_agreement_user_id_agreement_hash_key" ON "user_agreement"("user_id", "agreement_hash");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_journal_id_key" ON "voucher"("journal_id");

-- CreateIndex
CREATE UNIQUE INDEX "value_project_id_key" ON "value"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_image_file_id_key" ON "company"("image_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_kyc_registration_certificate_file_id_key" ON "company_kyc"("registration_certificate_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_kyc_tax_certificate_file_id_key" ON "company_kyc"("tax_certificate_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_kyc_representative_id_card_file_id_key" ON "company_kyc"("representative_id_card_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_image_file_id_key" ON "invoice"("image_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_image_file_id_key" ON "ocr"("image_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_image_id_key" ON "project"("image_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_image_File_id_key" ON "user"("image_File_id");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_parent_code_fkey" FOREIGN KEY ("parent_code") REFERENCES "account"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_root_code_fkey" FOREIGN KEY ("root_code") REFERENCES "account"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_report" ADD CONSTRAINT "audit_report_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_report" ADD CONSTRAINT "audit_report_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin" ADD CONSTRAINT "admin_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin" ADD CONSTRAINT "admin_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin" ADD CONSTRAINT "admin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authentication" ADD CONSTRAINT "authentication_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_kyc" ADD CONSTRAINT "company_kyc_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_setting" ADD CONSTRAINT "company_setting_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract" ADD CONSTRAINT "contract_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_created_user_id_fkey" FOREIGN KEY ("created_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "line_item" ADD CONSTRAINT "line_item_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_item" ADD CONSTRAINT "line_item_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr" ADD CONSTRAINT "ocr_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_record" ADD CONSTRAINT "payment_record_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "user_agreement" ADD CONSTRAINT "user_agreement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value" ADD CONSTRAINT "value_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_rate" ADD CONSTRAINT "work_rate_employee_project_id_fkey" FOREIGN KEY ("employee_project_id") REFERENCES "employee_project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_salary_record" ADD CONSTRAINT "voucher_salary_record_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_salary_record" ADD CONSTRAINT "voucher_salary_record_salary_record_id_fkey" FOREIGN KEY ("salary_record_id") REFERENCES "salary_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_salary_record" ADD CONSTRAINT "voucher_salary_record_voucher_salary_record_folder_id_fkey" FOREIGN KEY ("voucher_salary_record_folder_id") REFERENCES "voucher_salary_record_folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_salary_record_folder" ADD CONSTRAINT "voucher_salary_record_folder_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_kyc" ADD CONSTRAINT "company_kyc_registration_certificate_file_id_fkey" FOREIGN KEY ("registration_certificate_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_kyc" ADD CONSTRAINT "company_kyc_tax_certificate_file_id_fkey" FOREIGN KEY ("tax_certificate_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_kyc" ADD CONSTRAINT "company_kyc_representative_id_card_file_id_fkey" FOREIGN KEY ("representative_id_card_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr" ADD CONSTRAINT "ocr_image_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_image_File_id_fkey" FOREIGN KEY ("image_File_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER SEQUENCE "account_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "admin_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "asset_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "audit_report_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "client_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "company_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "company_kyc_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "company_setting_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "contract_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "department_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "employee_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "employee_project_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "income_expense_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "invitation_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "invoice_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "journal_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "line_item_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "milestone_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "ocr_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "order_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "payment_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "payment_record_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "plan_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "project_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "report_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "role_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "sale_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "salary_record_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "salary_record_project_hour_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "subscription_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "value_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "voucher_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "voucher_salary_record_folder_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "voucher_salary_record_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "work_rate_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "user_agreement_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "file_id_seq" RESTART WITH 10000000;
ALTER SEQUENCE "authentication_id_seq" RESTART WITH 10000000;