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

-- AddForeignKey
ALTER TABLE "invoice_rc2" ADD CONSTRAINT "invoice_rc2_accountbook_id_fkey" FOREIGN KEY ("accountbook_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_rc2" ADD CONSTRAINT "invoice_rc2_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_rc2" ADD CONSTRAINT "invoice_rc2_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_rc2" ADD CONSTRAINT "invoice_rc2_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- MoveData
INSERT INTO invoice_rc2 (
  id,
  accountbook_id,
  voucher_id,
  file_id,
  uploader_id,
  direction,
  ai_result_id,
  ai_status,
  created_at,
  updated_at,
  deleted_at,
  type,
  issued_date,
  no,
  currency_code,
  tax_type,
  tax_rate,
  net_amount,
  tax_amount,
  total_amount,
  is_generated,
  incomplete,
  description,
  note,
  deduction_type,
  sales_name,
  sales_id_number,
  is_shared_amount,
  buyer_name,
  buyer_id_number,
  return_or_allowance,
  total_of_summarized_invoices,
  carrier_serial_number,
  other_certificate_no
)
SELECT
  id,
  accountbook_id,
  voucher_id,
  file_id,
  uploader_id,
  direction,
  ai_result_id,
  "aiStatus",
  created_at,
  updated_at,
  deleted_at,
  type,
  issued_date,
  no,
  currency_code,
  tax_type,
  tax_rate,
  net_amount,
  tax_amount,
  total_amount,
  is_generated,
  incomplete,
  description,
  note,
  deduction_type,
  sales_name,
  sales_id_number,
  is_shared_amount,
  buyer_name,
  buyer_id_number,
  return_or_allowance,
  total_of_summarized_invoices,
  carrier_serial_number,
  other_certificate_no
FROM certificate_rc2;

