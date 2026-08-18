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

import { DEFAULT_FAITH_MEMORY_RETENTION_DAYS } from "@/constants/llm";
export enum SystemSettingKey {
  GOOGLE_OAUTH_CLIENT_ID = "GOOGLE_OAUTH_CLIENT_ID",
  GOOGLE_OAUTH_CLIENT_SECRET = "GOOGLE_OAUTH_CLIENT_SECRET",
  GEMINI_API_KEY = "GEMINI_API_KEY",
  // Info: (20260809 - Luphia) DB 鍵名刻意比 env 的 MODEL 明確；對應關係寫在 envKey
  LLM_MODEL = "LLM_MODEL",
  OEN_ACCESS_TOKEN = "OEN_ACCESS_TOKEN",
  OEN_MERCHANT_ID = "OEN_MERCHANT_ID",
  /**
   * Info: (20260812 - Luphia) 費思個人化記憶於付費訂閱終止後的保留天數（見
   * documents/architecture/ai_and_analytics/faith_personal_memory.md §7）。
   *
   * ⚠️ 調整此值等於變更對外承諾：服務條款 §3.7、《隱私權政策》§5 與訂閱方案頁
   * 均載明相同天數，改設定時必須同步修訂該三處文字。
   */
  FAITH_MEMORY_RETENTION_DAYS = "FAITH_MEMORY_RETENTION_DAYS",
  /**
   * Deprecated: (20260819 - Luphia) [start] 免費版人數上限已於 2026-08-19 移除
   * （免費方案的額度改為全隊共用一份，加人不再產生額度）。**程式碼已無任何讀者。**
   *
   * 這個鍵**刻意保留**：`loadSnapshot` 遇到 `SYSTEM_SETTING_DEFINITIONS` 裡沒有的
   * DB 列會把整組設定判為 UNTRUSTED，而該狀態下 `get()` 對**每一個**設定丟錯——
   * OAuth、LLM、SMTP 會一起停掉。也就是說「直接刪定義」會讓任何曾經設過這個值的
   * 環境在部署當下全站失能。
   *
   * 移除的前置條件（見部署檢查表 §3.5）：先由後台設定頁移除該列（走 `applySigned`
   * 才會重新簽章；直接用 SQL 刪會讓 digest 失配，症狀與上面一樣），確認所有環境
   * 都沒有這一列之後，才能刪掉這個鍵與下方的 fallback。
   */
  FREE_PLAN_MAX_MEMBERS = "FREE_PLAN_MAX_MEMBERS",
  // Deprecated: (20260819 - Luphia) [end]
  /**
   * Info: (20260814 - Luphia) 免費版團隊的人數上限（PR #6652 第二輪 B-4）。
   *
   * 額度改為逐成員計算後，免費版的席次單價是 0，乘上任何人數都是 0——
   * 一個 20 人的免費團隊等於每週 800 點的模型用量而月費為零。
   * 訂閱方案以「席次 × 單價」自然封頂，免費版只能靠人數上限。
   *
   * ⚠️ 服務條款 §3.1 載明「免費版團隊人數上限以方案頁標示為準」，
   * 調整此值必須同步方案頁的標示。
   */
  /**
   * Info: (20260815 - Luphia) 寄信設定（規範 §4 / P4：email 邀請）。
   *
   * 存於 DB 而非 env：與其他營運設定同一套（ADR 017），可由後台調整、不需重啟。
   * 未設定時邀請**明確失敗**而不是靜靜不寄——沒寄出去的邀請等於白收一席的錢。
   */
  SMTP_HOST = "SMTP_HOST",
  SMTP_PORT = "SMTP_PORT",
  SMTP_USER = "SMTP_USER",
  SMTP_PASSWORD = "SMTP_PASSWORD",
  // Info: (20260815 - Luphia) 寄件者顯示名稱與信箱，如 `iSunFA <no-reply@isunfa.com>`
  SMTP_FROM = "SMTP_FROM",
  // Info: (20260815 - Luphia) 邀請連結的站台網址（寄出的信裡要放絕對網址）
  APP_BASE_URL = "APP_BASE_URL",
}

// Info: (20260809 - Luphia) 設定分組，供設定頁排版
export enum SystemSettingGroup {
  THIRD_PARTY_LOGIN = "THIRD_PARTY_LOGIN",
  AI = "AI",
  PAYMENT = "PAYMENT",
  // Info: (20260815 - Luphia) 寄信（email 邀請）
  MAIL = "MAIL",
}

// Info: (20260809 - Luphia) 設定頁的分區順序
export const SYSTEM_SETTING_GROUP_ORDER: SystemSettingGroup[] = [
  SystemSettingGroup.THIRD_PARTY_LOGIN,
  SystemSettingGroup.AI,
  SystemSettingGroup.PAYMENT,
  SystemSettingGroup.MAIL,
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
  [SystemSettingKey.FAITH_MEMORY_RETENTION_DAYS]: {
    key: SystemSettingKey.FAITH_MEMORY_RETENTION_DAYS,
    group: SystemSettingGroup.AI,
    isSecret: false,
    envKey: "FAITH_MEMORY_RETENTION_DAYS",
  },
  // Deprecated: (20260819 - Luphia) [start] 見 SystemSettingKey.FREE_PLAN_MAX_MEMBERS 的說明
  [SystemSettingKey.FREE_PLAN_MAX_MEMBERS]: {
    key: SystemSettingKey.FREE_PLAN_MAX_MEMBERS,
    group: SystemSettingGroup.PAYMENT,
    isSecret: false,
    envKey: "FREE_PLAN_MAX_MEMBERS",
  },
  // Deprecated: (20260819 - Luphia) [end]
  [SystemSettingKey.SMTP_HOST]: {
    key: SystemSettingKey.SMTP_HOST,
    group: SystemSettingGroup.MAIL,
    isSecret: false,
    envKey: "SMTP_HOST",
  },
  [SystemSettingKey.SMTP_PORT]: {
    key: SystemSettingKey.SMTP_PORT,
    group: SystemSettingGroup.MAIL,
    isSecret: false,
    envKey: "SMTP_PORT",
  },
  [SystemSettingKey.SMTP_USER]: {
    key: SystemSettingKey.SMTP_USER,
    group: SystemSettingGroup.MAIL,
    isSecret: false,
    envKey: "SMTP_USER",
  },
  [SystemSettingKey.SMTP_PASSWORD]: {
    key: SystemSettingKey.SMTP_PASSWORD,
    group: SystemSettingGroup.MAIL,
    // Info: (20260815 - Luphia) 密碼屬秘密值：DB 內加密、讀取 API 一律遮蔽
    isSecret: true,
    envKey: "SMTP_PASSWORD",
  },
  [SystemSettingKey.SMTP_FROM]: {
    key: SystemSettingKey.SMTP_FROM,
    group: SystemSettingGroup.MAIL,
    isSecret: false,
    envKey: "SMTP_FROM",
  },
  [SystemSettingKey.APP_BASE_URL]: {
    key: SystemSettingKey.APP_BASE_URL,
    group: SystemSettingGroup.MAIL,
    isSecret: false,
    envKey: "APP_BASE_URL",
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
  // Info: (20260812 - Luphia) 保底值與 DEFAULT_FAITH_MEMORY_RETENTION_DAYS 同源，見 src/constants/llm.ts
  [SystemSettingKey.FAITH_MEMORY_RETENTION_DAYS]: String(
    DEFAULT_FAITH_MEMORY_RETENTION_DAYS,
  ),
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
 * Info: (20260811 - Luphia) DB 設定快照的四種狀態。
 *
 * 原本只有 trusted 布林值，於是「從來沒設定過」與「設定被竄改」變成同一件事，
 * 兩者都靜默退回 env——一行 SQL 就能讓系統改用 .env 裡輪替前的舊憑證，
 * 而管理員簽下的「這一項已清空」也會被無視。這兩種情況必須分開處置。
 */
export enum SettingSnapshotState {
  // Info: (20260811 - Luphia) 尚未使用 DB 保管設定，遷移期的正常狀態，允許讀 env
  EMPTY = "EMPTY",
  // Info: (20260811 - Luphia) 驗簽通過，DB 就是唯一事實來源，不再讀 env
  TRUSTED = "TRUSTED",
  // Info: (20260811 - Luphia) DB 有設定但驗不過＝遭竄改，一律 fail closed
  UNTRUSTED = "UNTRUSTED",
  // Info: (20260811 - Luphia) DB 暫時讀不到（連線抖動），不快取、允許暫時讀 env
  UNAVAILABLE = "UNAVAILABLE",
}

// Info: (20260811 - Luphia) 設定值的來源，供設定頁標示；服務層與畫面共用同一組定義
export enum SystemSettingSource {
  DB = "DB",
  ENV = "ENV",
  NONE = "NONE",
}

/**
 * Info: (20260811 - Luphia) 設定頁儲存流程的狀態。
 * 原本以 inline 字面聯集寫在畫面裡並直接字串比對，屬於規範禁止的魔法字串。
 */
export enum SettingSaveStatus {
  IDLE = "IDLE",
  SIGNING = "SIGNING",
  SAVING = "SAVING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

/**
 * Info: (20260809 - Luphia) 全集簽章 manifest 的固定主鍵（單列設計）。
 * 與 FaithBillingSetting 的 "default" 慣例一致。
 */
export const SYSTEM_SETTING_MANIFEST_KEY = "default";
