----------Info: 新增 enum----------
BEGIN;
-- CreateEnum
CREATE TYPE "FilingFrequency" AS ENUM ('BIMONTHLY_FILING', 'MONTHLY_FILING');

-- CreateEnum
CREATE TYPE "FilingMethod" AS ENUM ('SINGLE_ENTITY_FILING', 'CONSOLIDATED_FILING', 'INDIVIDUAL_FILING');

-- CreateEnum
CREATE TYPE "DeclarantFilingMethod" AS ENUM ('SELF_FILING', 'AGENT_FILING');

-- CreateEnum
CREATE TYPE "AgentFilingRole" AS ENUM ('ACCOUNTANT', 'BOOKKEEPER', 'BOOKKEEPER_AND_FILING_AGENT');
COMMIT;
----------Info: 新增 enum----------



----------Info: 新增其他欄位----------
BEGIN;
-- AlterTable
ALTER TABLE "company_setting" ADD COLUMN     "agent_filing_role" "AgentFilingRole",
ADD COLUMN     "contact_person" TEXT,
ADD COLUMN     "declarant_filing_method" "DeclarantFilingMethod",
ADD COLUMN     "declarant_name" TEXT,
ADD COLUMN     "declarant_personal_id" TEXT,
ADD COLUMN     "declarant_phone_number" TEXT,
ADD COLUMN     "filing_frequency" "FilingFrequency",
ADD COLUMN     "filing_method" "FilingMethod",
ADD COLUMN     "license_id" TEXT;
COMMIT;
----------Info: 新增其他欄位----------



----------Info: 修改 address 欄位----------
BEGIN;
-- 步驟 1: 先在 company_setting 表添加 address_json 欄位
ALTER TABLE "company_setting" ADD COLUMN "address_json" JSONB;

-- 步驟 2: 更新新欄位，將原有字串資料放入 JSON 結構中的 enteredAddress
UPDATE "company_setting"
SET "address_json" = jsonb_build_object(
  'city', '',
  'district', '',
  'enteredAddress', "address"
);

-- 步驟 3: 檢查資料是否正確轉換
SELECT id, address, address_json FROM "company_setting" LIMIT 10;

-- 步驟 4: 備份原始欄位資料（可選）
-- ALTER TABLE "company_setting" RENAME COLUMN "address" TO "address_original";
-- 步驟 5: 刪除原始欄位並將新欄位重命名為原始名稱
ALTER TABLE "company_setting" DROP COLUMN "address";
ALTER TABLE "company_setting" RENAME COLUMN "address_json" TO "address";

-- AlterTable
ALTER TABLE "company_setting" ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "address" SET DEFAULT '{"city": "", "district": "", "enteredAddress": ""}';
COMMIT;
----------Info: 修改 address 欄位----------

