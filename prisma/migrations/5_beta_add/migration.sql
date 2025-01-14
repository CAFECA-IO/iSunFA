/* Info: (20241219 - Shirley)
第一批 db migration
*/
-- Step 1. asset table ✅
-- 1-1. 新增 user_id 欄位為可選
ALTER TABLE "asset"
ADD COLUMN "created_user_id" INT;

-- 1-2. 更新現有 asset data 的 user_id 為對應公司的擁有者的 user_id，如果沒有對應的 admin，則設為 1000
UPDATE "asset" AS a
SET "created_user_id" = COALESCE(
  (SELECT admin."user_id" 
   FROM "admin" AS admin 
   WHERE a."company_id" = admin."company_id" 
   LIMIT 1),
  1000
);

-- 1-3. 將 asset table 的 user_id 欄位設為必填
ALTER TABLE "asset"
ALTER COLUMN "created_user_id" SET NOT NULL;

-- 1-4. 添加外鍵約束，確保 user_id 參照 User 表的 id
ALTER TABLE "asset" ADD CONSTRAINT "asset_created_user_id_fkey" FOREIGN KEY ("created_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 1-5. 刪掉 asset table 的 accumulated_depreciation, remaining_life 欄位
ALTER TABLE "asset" DROP COLUMN "accumulated_depreciation",
DROP COLUMN "remaining_life";

-- Step 2. todo table ✅
-- 2-1. 新增 end_date 和 start_date 選填(optional)欄位
ALTER TABLE "todo" ADD COLUMN     "end_date" INTEGER DEFAULT 0,
ADD COLUMN     "start_date" INTEGER DEFAULT 0;

-- 2-2. 將 start_date 和 end_date 設為必填(required)
ALTER TABLE "todo"
ALTER COLUMN "start_date" SET NOT NULL,
ALTER COLUMN "end_date" SET NOT NULL;


-- Step 3. kyc_bookkeeper table => kyc_role table ✅
-- 3-1. 將 kyc_bookkeeper 表重命名為 kyc_role
ALTER TABLE "kyc_bookkeeper"
RENAME TO "kyc_role";

-- 3-2. 新增 role_id 欄位
ALTER TABLE "kyc_role"
ADD COLUMN "role_id" INTEGER NOT NULL;

-- 3-3. 新增 start_date_of_practice 欄位
ALTER TABLE "kyc_role"
ADD COLUMN "start_date_of_practice" INTEGER NOT NULL;

-- 3-4. 新增 association 欄位
ALTER TABLE "kyc_role"
ADD COLUMN "association" TEXT NOT NULL;

-- 3-5. 新增 membership_number 欄位
ALTER TABLE "kyc_role"
ADD COLUMN "membership_number" TEXT NOT NULL;

-- 3-6. 將 role_id 關聯到 role 表的 id
ALTER TABLE "kyc_role"
ADD CONSTRAINT "kyc_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3-7. 重命名 kyc_role 表的 pkey
ALTER TABLE "kyc_role"
RENAME CONSTRAINT "kyc_bookkeeper_pkey" TO "kyc_role_pkey";

-- 3-8. 重命名 kyc_role 表的 fkey
ALTER TABLE "kyc_role" RENAME CONSTRAINT "kyc_bookkeeper_certification_file_id_fkey" TO "kyc_role_certification_file_id_fkey";
ALTER TABLE "kyc_role" RENAME CONSTRAINT "kyc_bookkeeper_personal_id_file_id_fkey" TO "kyc_role_personal_id_file_id_fkey";
ALTER TABLE "kyc_role" RENAME CONSTRAINT "kyc_bookkeeper_user_id_fkey" TO "kyc_role_user_id_fkey";

-- 3-9. 重命名 kyc_role 表的 index
ALTER INDEX "kyc_bookkeeper_certification_file_id_key" RENAME TO "kyc_role_certification_file_id_key";
ALTER INDEX "kyc_bookkeeper_personal_id_file_id_key" RENAME TO "kyc_role_personal_id_file_id_key";

-- 3-10. 重命名 kyc_role table 的 sequence
ALTER SEQUENCE "kyc_bookkeeper_id_seq"
RENAME TO "kyc_role_id_seq";

-- 3-11. 重命名 kyc_role table 的 id 的 column_default
ALTER TABLE "kyc_role"
ALTER COLUMN "id" SET DEFAULT nextval('kyc_role_id_seq');


-- Step 4. country table ✅
-- 4-1. 根據需要的結構(schema)，建立 country table
CREATE TABLE "country" (
    "id" SERIAL NOT NULL,         -- 自動遞增的主鍵欄位
    "name" TEXT NOT NULL,         -- 國家名稱
    "locale_key" TEXT NOT NULL,   -- 地區代碼
    "phone_code" TEXT NOT NULL,   -- 國際電話區號
    "currency_code" TEXT NOT NULL, -- 貨幣代碼
    "currency_name" TEXT NOT NULL, -- 貨幣名稱

    CONSTRAINT "country_pkey" PRIMARY KEY ("id") -- 設定主鍵約束
);

-- 4-2. country id 從 10000000 開始
ALTER SEQUENCE "country_id_seq" RESTART WITH 10000000;

-- 4-3. 新增台灣做為預設資料，讓現有的 user_setting data 可以對應到 country table
INSERT INTO "country" ("name", "locale_key", "phone_code", "currency_code", "currency_name")
VALUES ('Taiwan', 'tw', '+886', 'TWD', 'New Taiwan Dollar');


-- Step 5. user_setting table ✅
-- 5-1. 將 country_id 欄位添加到 user_setting 表中
ALTER TABLE "user_setting"
ADD COLUMN "country_id" INTEGER;

-- 5-2. 將 user_setting existing data 的 country_id 設定為台灣的 id
UPDATE "user_setting"
SET "country_id" = (SELECT "id" FROM "country" WHERE "locale_key" = 'tw')
WHERE "country_id" IS NULL;

-- 5-3. 將 country_id 設為必填
ALTER TABLE "user_setting"
ALTER COLUMN "country_id" SET NOT NULL;

-- 5-4. 將 country_id 關聯到 country 表的 id
ALTER TABLE "user_setting"
ADD CONSTRAINT "user_setting_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5-5. 刪掉 user_setting 表中的 country 欄位
ALTER TABLE "user_setting"
DROP COLUMN "country";

-- 5-6. 將 user_setting 表中的 user_id 關聯到 user 表的 id
ALTER TABLE "user_setting"
ADD CONSTRAINT "user_setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/* Info: (20241219 - Shirley)
第二批 db migration
*/

-- DropIndex
DROP INDEX "account_id_key";

/*
Step 1. country table
1-1. 新增 code 欄位為 optional
1-2. 新增 phone_example 欄位為 optional
1-3. 將現有 data 的 code 和 phone_example 設定為對應的值
1-4. 將 code 和 phone_example 設定為 required


Info: (20250108 - Shirley) 後來虛擬科目是在 list trial balance 即時生成，所以不需要更改 DB
Step 2. account table ⏭️
2-1. 新增 for_user_ledger 欄位為 optional
2-2. 新增 for_user_voucher 欄位
2-3. 將 for_user 欄位的值複製到 for_user_voucher
2-4. 將現有 data 的 for_user_ledger 欄位的值，從 for_user 欄位複製過來
2-5. 將 for_user_ledger 設定為 required
2-6. 將 for_user_voucher 設定為 required
2-7. 刪除 for_user 欄位
2-8. 將預設會計科目的 for_user_voucher 改為 false，將自訂會計科目的 for_user_voucher 保留原本的值
2-9. 在 for_user 為 true 的值，複製一份並將其設為複製對象的 children
2-10. 在新增的欄位 "for_user_ledger", "for_user_voucher" 加上 default 值，讓以後沒有給值也能正常運作
*/


-- Step 1. country table ✅
-- 1-1. 新增 code 欄位為 optional
-- 1-2. 新增 phone_example 欄位為 optional
ALTER TABLE "country" ADD COLUMN     "code" TEXT,
ADD COLUMN     "phone_example" TEXT, 
ADD COLUMN     "created_at" INTEGER,
ADD COLUMN     "updated_at" INTEGER,
ADD COLUMN     "deleted_at" INTEGER;

-- 1-3. 將現有 data 的 code 和 phone_example 設定為對應的值
UPDATE "country"
SET "code" = 'tw',
    "phone_example" = '0912345678',
    "created_at" = 0,
    "updated_at" = 0
WHERE "locale_key" = 'tw';

-- 1-4. 將 code 和 phone_example 設定為 required
ALTER TABLE "country" ALTER COLUMN "code" SET NOT NULL,
ALTER COLUMN "phone_example" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;


/* Info: (20250108 - Shirley)
第三批 db migration
*/

/*
Step 1. 在 invoice table 拿掉 counter_party_id 的 fk，刪掉 counter_party_id 欄位

Step 2. 新增 counter_party_info 欄位

Step 3. 更新現有 invoice data
讀取現有 invoice data 的 no 欄位，將 counter_party_info 設定為對應的值，如果沒有的話則留空
*/

-- Step 1. 刪除 invoice schema 的 counter_party_id 的 fk，刪掉 counter_party_id 欄位 ✅
-- DropForeignKey
ALTER TABLE "invoice" DROP CONSTRAINT "invoice_counter_party_id_fkey";
ALTER TABLE "invoice" DROP COLUMN "counter_party_id";

ALTER TABLE "invoice" ADD COLUMN "counter_party_info" TEXT;
UPDATE "invoice" SET "counter_party_info" = "no"
WHERE "no" ~ '^\{.*\}$';




