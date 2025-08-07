-- 006_convert_invoice_rc2_amounts_to_decimal
-- 將 invoice_rc2 表格的金額欄位從 Int 轉換為 NUMERIC(26,8)

-- 1. 新增 NUMERIC(26,8) 欄位
ALTER TABLE "invoice_rc2" 
ADD COLUMN "net_amount_new" NUMERIC(26,8),
ADD COLUMN "tax_amount_new" NUMERIC(26,8),
ADD COLUMN "total_amount_new" NUMERIC(26,8),
ADD COLUMN "total_of_summarized_invoices_new" NUMERIC(26,8);

-- 2. 遷移現有資料：保持原始整數值不變，直接轉換為 NUMERIC(26,8)
UPDATE "invoice_rc2" 
SET "net_amount_new" = CASE 
  WHEN "net_amount" IS NULL THEN NULL 
  ELSE "net_amount"::NUMERIC(26,8)
END,
"tax_amount_new" = CASE 
  WHEN "tax_amount" IS NULL THEN NULL 
  ELSE "tax_amount"::NUMERIC(26,8)
END,
"total_amount_new" = CASE 
  WHEN "total_amount" IS NULL THEN NULL 
  ELSE "total_amount"::NUMERIC(26,8)
END,
"total_of_summarized_invoices_new" = CASE 
  WHEN "total_of_summarized_invoices" IS NULL THEN NULL 
  ELSE "total_of_summarized_invoices"::NUMERIC(26,8)
END;

-- 3. 刪除舊欄位並重新命名新欄位
ALTER TABLE "invoice_rc2" 
DROP COLUMN "net_amount",
DROP COLUMN "tax_amount",
DROP COLUMN "total_amount",
DROP COLUMN "total_of_summarized_invoices";

ALTER TABLE "invoice_rc2"
RENAME COLUMN "net_amount_new" TO "net_amount";

ALTER TABLE "invoice_rc2"
RENAME COLUMN "tax_amount_new" TO "tax_amount";

ALTER TABLE "invoice_rc2"
RENAME COLUMN "total_amount_new" TO "total_amount";

ALTER TABLE "invoice_rc2"
RENAME COLUMN "total_of_summarized_invoices_new" TO "total_of_summarized_invoices";

-- 4. 重建相關索引以優化 NUMERIC 型別查詢
DROP INDEX IF EXISTS idx_invoice_rc2_amounts;
CREATE INDEX idx_invoice_rc2_amounts ON "invoice_rc2" ("net_amount", "tax_amount", "total_amount");

DROP INDEX IF EXISTS idx_invoice_rc2_total_amount;
CREATE INDEX idx_invoice_rc2_total_amount ON "invoice_rc2" ("total_amount") WHERE "total_amount" IS NOT NULL;
