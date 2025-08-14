-- 007_convert_line_item_amount_to_decimal
-- 將 line_item 表格的 amount 欄位從 DOUBLE PRECISION 轉換為 NUMERIC(26,8)

-- 1. 新增 NUMERIC(26,8) 欄位
ALTER TABLE "line_item" 
ADD COLUMN "amount_new" NUMERIC(26,8);

-- 2. 遷移現有資料：將 DOUBLE PRECISION 轉換為 NUMERIC(26,8)
UPDATE "line_item" 
SET "amount_new" = CASE 
  WHEN "amount" IS NULL THEN NULL 
  ELSE "amount"::NUMERIC(26,8)
END;

-- 3. 刪除舊欄位並重新命名新欄位
ALTER TABLE "line_item" 
DROP COLUMN "amount";

ALTER TABLE "line_item"
RENAME COLUMN "amount_new" TO "amount";

-- 4. 重建相關索引以優化 NUMERIC 型別查詢
DROP INDEX IF EXISTS idx_line_item_amount;
CREATE INDEX idx_line_item_amount ON "line_item" ("amount") WHERE "amount" IS NOT NULL;

DROP INDEX IF EXISTS idx_line_item_voucher_amount;
CREATE INDEX idx_line_item_voucher_amount ON "line_item" ("voucher_id", "amount");