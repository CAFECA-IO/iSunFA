/**
 * Info: (20260811 - Julian) 人事模組個資保護的共用常數（加解密、遮罩、稽核三方的單一來源）。
 *
 * 分級與決策理由見 `documents/architecture/decisions/018_hr_pii_data_classification.md`
 * 與 `prisma/schema.prisma` 人事區塊開頭的說明。
 */

// Info: (20260811 - Julian) 個資敏感度分級。決定「要不要加密」與「讀完整值要不要寫稽核」兩件事
export enum PiiTier {
  // Info: (20260811 - Julian) 受限：單獨即可用於冒用身分或盜用金流（身分證、銀行帳號、戶名）
  RESTRICTED = "RESTRICTED",
  // Info: (20260811 - Julian) 機密：可識別特定自然人，但單獨不足以冒用（生日、住址、電話）
  CONFIDENTIAL = "CONFIDENTIAL",
}

/**
 * Info: (20260811 - Julian) 加解密參數。encrypt / decrypt / 金鑰輪替腳本共用，改一處全體一致。
 *
 * 選 AES-256-GCM 而不是 CBC：GCM 自帶完整性標籤，密文被竄改會在解密時直接失敗，
 * 而 CBC 會安靜地吐出一段垃圾明文 —— 對身分證與銀行帳號來說，
 * 「解出錯的值」比「解不出來」危險得多。
 */
export const HR_PII_ALGORITHM = "AES-256-GCM";
export const HR_PII_CIPHER = "aes-256-gcm";
export const HR_PII_KEY_BYTES = 32;
export const HR_PII_IV_BYTES = 12;
export const HR_PII_TAG_BYTES = 16;

// Info: (20260811 - Julian) 盲索引雜湊演算法（HMAC-SHA256），供身分證的帳本內唯一性比對
export const HR_PII_BLIND_INDEX_HASH = "sha256";

/**
 * Info: (20260811 - Julian) 金鑰與 pepper 的環境變數名稱。
 *
 * 兩者刻意分開：pepper 一旦更換，所有 `nationalIdHash` 都要重算，
 * 而資料加密金鑰輪替只需重加密密文欄位。綁在同一把上會讓「輪替金鑰」
 * 這件本來例行的事變成必須同時重建唯一索引的高風險作業。
 */
export const HR_PII_KEY_ENV_PREFIX = "HR_PII_KEY_V";
export const HR_PII_BLIND_INDEX_PEPPER_ENV = "HR_PII_BLIND_INDEX_PEPPER";

// Info: (20260811 - Julian) 新資料一律以目前這代金鑰加密；舊代僅供解密（輪替期間新舊並存）
export const HR_PII_CURRENT_KEY_VERSION = 1;

/**
 * Info: (20260811 - Julian) 遮罩後保留的尾碼長度。
 *
 * 留 3 碼而不是 4：台灣身分證字號共 10 碼，末 4 碼會連同首字母的縣市碼
 * 與第 2 碼的性別碼一起，把可能組合壓到可猜測的範圍。銀行帳號同理從寬。
 */
export const HR_PII_MASK_VISIBLE_TAIL = 3;
export const HR_PII_MASK_CHAR = "*";

/**
 * Info: (20260811 - Julian) 各密文欄位的分級表。
 *
 * key 是 Prisma 欄位名，讓 repository 能直接用欄位名查出分級，
 * 不必在每個呼叫點重寫一次 if。RESTRICTED 的欄位讀取完整值時，
 * service 層必須寫一筆 `AuditLogAction.READ` + `AuditLogDataType.EMPLOYEE_PII`。
 */
export const HR_PII_FIELD_TIER = {
  // Info: (20260811 - Julian) Employee
  nationalIdCipher: PiiTier.RESTRICTED,
  birthdayCipher: PiiTier.CONFIDENTIAL,
  addressCipher: PiiTier.CONFIDENTIAL,
  phoneCipher: PiiTier.CONFIDENTIAL,
  /**
   * Info: (20260812 - Julian) 個人信箱與公司信箱 (`email`) 分級不同。
   * 公司信箱是 Tier 3：它是複合唯一鍵成員、全公司通訊錄都看得到；
   * 個人信箱是跟著人走的識別碼，離職後仍然有效。
   */
  personalEmailCipher: PiiTier.CONFIDENTIAL,
  // Info: (20260811 - Julian) BankAccount
  accountNumberCipher: PiiTier.RESTRICTED,
  accountHolderCipher: PiiTier.RESTRICTED,
  // Info: (20260811 - Julian) EmergencyContact
  altPhoneCipher: PiiTier.CONFIDENTIAL,
  /**
   * Info: (20260813 - Julian) AttendancePunch —— 打卡當下的座標。行蹤資料，
   * 敏感度不低於通訊地址：住址是靜態的一個點，座標序列是動態的行蹤。
   *
   * 分級理由、緩解手段與尚未解決的保存期限問題見
   * ADR 018 的「補充決策（2026-08-14 review）」，不要只依賴這裡的摘要。
   */
  latitudeCipher: PiiTier.CONFIDENTIAL,
  longitudeCipher: PiiTier.CONFIDENTIAL,
} as const satisfies Record<string, PiiTier>;

export type HrPiiCipherField = keyof typeof HR_PII_FIELD_TIER;

/**
 * Info: (20260811 - Julian) 持有個資的資料表名稱。
 *
 * 用於不變式的錯誤訊息與金鑰輪替腳本的巡覽清單 ——
 * 輪替時漏掉一張表，那張表的資料會在舊金鑰退役後永遠解不開，
 * 所以清單必須有單一來源，不能散在腳本裡各寫一份。
 */
export enum HrPiiTable {
  EMPLOYEE = "Employee",
  DEPENDENT = "Dependent",
  BANK_ACCOUNT = "BankAccount",
  EMERGENCY_CONTACT = "EmergencyContact",
  // Info: (20260813 - Julian) 簽到系統的打卡紀錄，持有加密的經緯度
  ATTENDANCE_PUNCH = "AttendancePunch",
}
