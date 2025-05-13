/*
  Warnings:

  - The `type` column on the `certificate_rc2` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `direction` on the `certificate_rc2` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "InvoiceDirection" AS ENUM ('INPUT', 'OUTPUT');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM (
  'INPUT_20', 'INPUT_21', 'INPUT_22', 'INPUT_23', 'INPUT_24', 
  'INPUT_25', 'INPUT_26', 'INPUT_27', 'INPUT_28', 'INPUT_29',
  'OUTPUT_30', 'OUTPUT_31', 'OUTPUT_32', 'OUTPUT_33', 'OUTPUT_34', 
  'OUTPUT_35', 'OUTPUT_36'
);

-- 使用安全的轉換方式，避免型別問題
-- 步驟 1: 以文本形式添加新欄位
ALTER TABLE "certificate_rc2" ADD COLUMN "new_direction" TEXT;
ALTER TABLE "certificate_rc2" ADD COLUMN "new_type" TEXT;

-- 步驟 2: 設置 new_direction 值
UPDATE "certificate_rc2" SET "new_direction" = 'INPUT' 
WHERE "direction"::text = 'INPUT';
UPDATE "certificate_rc2" SET "new_direction" = 'OUTPUT' 
WHERE "direction"::text = 'OUTPUT';
-- 處理空值
UPDATE "certificate_rc2" SET "new_direction" = 'INPUT' 
WHERE "new_direction" IS NULL;

-- 步驟 3: 設置 new_type 值（基於現有枚舉值映射）
UPDATE "certificate_rc2" SET "new_type" = "type"::text 
WHERE "type" IS NOT NULL;

-- 步驟 4: 刪除舊列並重命名新列
ALTER TABLE "certificate_rc2" DROP COLUMN "direction";
ALTER TABLE "certificate_rc2" DROP COLUMN "type";

ALTER TABLE "certificate_rc2" RENAME COLUMN "new_direction" TO "direction";
ALTER TABLE "certificate_rc2" RENAME COLUMN "new_type" TO "type";

-- 步驟 5: 將文本列轉換為枚舉類型
ALTER TABLE "certificate_rc2" ALTER COLUMN "direction" TYPE "InvoiceDirection" USING "direction"::text::"InvoiceDirection";
ALTER TABLE "certificate_rc2" ALTER COLUMN "type" TYPE "InvoiceType" USING "type"::text::"InvoiceType";

-- 步驟 6: 設置 direction 為非空
ALTER TABLE "certificate_rc2" ALTER COLUMN "direction" SET NOT NULL;

-- 清理舊的枚舉類型
DROP TYPE IF EXISTS "CertificateDirection";
DROP TYPE IF EXISTS "CertificateType";
