/**
 * Info: (20260809 - Luphia) 存放於資料庫的系統設定清單。
 *
 * 判斷一個參數該放 env 還是 DB 的準則：
 * - 留 env：讀 DB 之前就要用到（DATABASE_URL、POSTGRES_*）、保護 DB 內容的金鑰
 *   （SECRET_VAULT_MASTER_KEY、DEWT_PRIVATE_KEY_PEM）、驗證 DB 簽章的信任根
 *   （SUPER_ADMIN_CRED_ID / PUB_X / PUB_Y），以及所有 NEXT_PUBLIC_*
 *   （Next.js 於 build 時內嵌進 client bundle，DB 的值到不了瀏覽器）。
 * - 進 DB：其餘 server-only 的 runtime 設定。改這些不需要重簽 .env，也不需要重啟容器。
 *
 * 新增設定時只要在這裡多一筆定義，設定頁、簽章與讀取邏輯都會自動涵蓋。
 */
export enum SystemSettingKey {
  GOOGLE_OAUTH_CLIENT_ID = "GOOGLE_OAUTH_CLIENT_ID",
  GOOGLE_OAUTH_CLIENT_SECRET = "GOOGLE_OAUTH_CLIENT_SECRET",
  GEMINI_API_KEY = "GEMINI_API_KEY",
  // Info: (20260809 - Luphia) DB 鍵名刻意比 env 的 MODEL 明確；對應關係寫在 envKey
  LLM_MODEL = "LLM_MODEL",
  OEN_ACCESS_TOKEN = "OEN_ACCESS_TOKEN",
  OEN_MERCHANT_ID = "OEN_MERCHANT_ID",
}

// Info: (20260809 - Luphia) 設定分組，供設定頁排版
export enum SystemSettingGroup {
  THIRD_PARTY_LOGIN = "THIRD_PARTY_LOGIN",
  AI = "AI",
  PAYMENT = "PAYMENT",
}

// Info: (20260809 - Luphia) 設定頁的分區順序
export const SYSTEM_SETTING_GROUP_ORDER: SystemSettingGroup[] = [
  SystemSettingGroup.THIRD_PARTY_LOGIN,
  SystemSettingGroup.AI,
  SystemSettingGroup.PAYMENT,
];

export interface ISystemSettingDefinition {
  key: SystemSettingKey;
  group: SystemSettingGroup;
  // Info: (20260809 - Luphia) 秘密值：DB 內以 AES-256-GCM 加密，讀取 API 一律遮蔽不回傳明文
  isSecret: boolean;
  /**
   * Info: (20260809 - Luphia) 過渡期的環境變數 fallback。
   * DB 尚未設定時仍讀 env，既有部署不改任何東西也能繼續運作。
   */
  envKey: string;
}

export const SYSTEM_SETTING_DEFINITIONS: Record<
  SystemSettingKey,
  ISystemSettingDefinition
> = {
  [SystemSettingKey.GOOGLE_OAUTH_CLIENT_ID]: {
    key: SystemSettingKey.GOOGLE_OAUTH_CLIENT_ID,
    group: SystemSettingGroup.THIRD_PARTY_LOGIN,
    isSecret: false,
    envKey: "GOOGLE_OAUTH_CLIENT_ID",
  },
  [SystemSettingKey.GOOGLE_OAUTH_CLIENT_SECRET]: {
    key: SystemSettingKey.GOOGLE_OAUTH_CLIENT_SECRET,
    group: SystemSettingGroup.THIRD_PARTY_LOGIN,
    isSecret: true,
    envKey: "GOOGLE_OAUTH_CLIENT_SECRET",
  },
  [SystemSettingKey.GEMINI_API_KEY]: {
    key: SystemSettingKey.GEMINI_API_KEY,
    group: SystemSettingGroup.AI,
    isSecret: true,
    envKey: "GEMINI_API_KEY",
  },
  [SystemSettingKey.LLM_MODEL]: {
    key: SystemSettingKey.LLM_MODEL,
    group: SystemSettingGroup.AI,
    isSecret: false,
    envKey: "MODEL",
  },
  [SystemSettingKey.OEN_ACCESS_TOKEN]: {
    key: SystemSettingKey.OEN_ACCESS_TOKEN,
    group: SystemSettingGroup.PAYMENT,
    isSecret: true,
    envKey: "OEN_ACCESS_TOKEN",
  },
  [SystemSettingKey.OEN_MERCHANT_ID]: {
    key: SystemSettingKey.OEN_MERCHANT_ID,
    group: SystemSettingGroup.PAYMENT,
    isSecret: false,
    envKey: "OEN_MERCHANT_ID",
  },
};

/**
 * Info: (20260809 - Luphia) 設定缺漏時的保底值。
 * 只放「有合理預設、缺了也不該讓功能整個停擺」的項目；
 * 金鑰與憑證一律沒有預設值——寧可功能停用，也不要以錯誤憑證對外呼叫。
 */
export const SYSTEM_SETTING_FALLBACKS: Partial<
  Record<SystemSettingKey, string>
> = {
  [SystemSettingKey.OEN_MERCHANT_ID]: "mermer",
};

export const SYSTEM_SETTING_KEYS = Object.keys(
  SYSTEM_SETTING_DEFINITIONS,
) as SystemSettingKey[];

export function isSystemSettingKey(value: unknown): value is SystemSettingKey {
  return (
    typeof value === "string" &&
    (SYSTEM_SETTING_KEYS as string[]).includes(value)
  );
}

// Info: (20260809 - Luphia) 設定頁回傳秘密值時的遮罩，避免把明文送到瀏覽器
export const SECRET_MASK = "********";

/**
 * Info: (20260809 - Luphia) 全集簽章 manifest 的固定主鍵（單列設計）。
 * 與 FaithBillingSetting 的 "default" 慣例一致。
 */
export const SYSTEM_SETTING_MANIFEST_KEY = "default";
