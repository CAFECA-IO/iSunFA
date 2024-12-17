-- Step 1. asset table ✅
-- 1-1. 新增 user_id 欄位為可選
ALTER TABLE "asset"
ADD COLUMN "user_id" INT;

-- 1-2. 更新現有 asset data 的 user_id 為對應公司的擁有者的 user_id，如果沒有對應的 admin，則設為 1000
UPDATE "asset" AS a
SET "user_id" = COALESCE(
  (SELECT admin."user_id" 
   FROM "admin" AS admin 
   WHERE a."company_id" = admin."company_id" 
   LIMIT 1),
  1000
);

-- 1-3. 將 asset table 的 user_id 欄位設為必填
ALTER TABLE "asset"
ALTER COLUMN "user_id" SET NOT NULL;

-- 1-4. 添加外鍵約束，確保 user_id 參照 User 表的 id
ALTER TABLE "asset" ADD CONSTRAINT "asset_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 1-5. 刪掉 asset table 的 accumulated_depreciation, remaining_life, residual_value 欄位
ALTER TABLE "asset" DROP COLUMN "accumulated_depreciation",
DROP COLUMN "remaining_life",
DROP COLUMN "residual_value";


-- Step 2. todo table ✅
-- 2-1. 新增 end_date 和 start_date 選填(optional)欄位
ALTER TABLE "todo" ADD COLUMN     "end_date" INTEGER,
ADD COLUMN     "start_date" INTEGER;

-- 將現有的 todo data 的 start_date 和 end_date 設定為 created_at
UPDATE "todo"
SET 
    "start_date" = "created_at",
    "end_date" = "created_at"
WHERE "start_date" IS NULL OR "end_date" IS NULL;

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
ADD COLUMN "start_date_of_practice" TEXT NOT NULL;

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
