/**
 * Info: (20260817 - Luphia) 費思長期記憶的常數（規範 faith_personal_memory.md）。
 *
 * 本次為**最小實作**：儲存 + 方案 gate + 注入 + 萃取 + 90 天保留與刪除。
 * 規範 §4 提到的語意去重、§8 的後台觀測介面不在此列——那些是好用，
 * 而這裡先讓條款 §3.7 承諾的東西真的存在。
 */

/**
 * Info: (20260817 - Luphia) 記憶項目的分類（規範 §4.1）。
 *
 * **封閉列舉**，由 LLM 的 `responseSchema` enum 約束：開放字串會讓分類
 * 隨模型心情長出無限多種，而分類是後續淘汰與呈現的依據。
 */
export const FAITH_MEMORY_CATEGORY = {
  // Info: (20260817 - Luphia) 慣用科目、記帳習慣
  ACCOUNTING_PREFERENCE: "ACCOUNTING_PREFERENCE",
  // Info: (20260817 - Luphia) 報表呈現方式
  REPORT_FORMAT: "REPORT_FORMAT",
  // Info: (20260817 - Luphia) 回答的詳細程度與語氣
  ANSWER_STYLE: "ANSWER_STYLE",
  // Info: (20260817 - Luphia) 慣用術語與稱呼
  TERMINOLOGY: "TERMINOLOGY",
  // Info: (20260817 - Luphia) 產業別、公司型態等長期成立的背景
  DOMAIN_CONTEXT: "DOMAIN_CONTEXT",
} as const;

export type FaithMemoryCategory =
  (typeof FAITH_MEMORY_CATEGORY)[keyof typeof FAITH_MEMORY_CATEGORY];

/**
 * Info: (20260817 - Luphia) 刪除原因（規範 §3.2）。
 * 稽核列只記原因與條目數，**不記內容**——否則「刪除」等於搬家。
 */
export const FAITH_MEMORY_DELETION_REASON = {
  RETENTION_EXPIRED: "RETENTION_EXPIRED",
  USER_REQUEST: "USER_REQUEST",
  ACCOUNT_TERMINATED: "ACCOUNT_TERMINATED",
  TEAM_DISSOLVED: "TEAM_DISSOLVED",
  /**
   * Info: (20260818 - Luphia) 成員被移出團隊（第三輪 C-8）。
   *
   * 離開之後那份記憶沒有任何用途：他不會再在這個團隊裡對話，
   * 而規範 §3.1 的隔離理由（事務所成員同時服務多家客戶）正好反過來說明
   * 為什麼不該留——留著只是一份沒有主人的偏好資料。
   */
  MEMBER_REMOVED: "MEMBER_REMOVED",
  /**
   * Info: (20260818 - Luphia) 密文讀不出來，內容被新的寫入取代（第四輪 B-4）。
   *
   * 不是使用者或系統決定要刪，而是**已經讀不到了**——最常見的成因是遷移
   * （AAD 綁定之前封裝的密文，以新的 AAD 解必定失敗），其次是金鑰輪替失誤
   * 或密文毀損。
   *
   * 之所以要有這個 reason：解不開時回空記憶，下一次寫入就會把空的合併結果
   * 蓋上去。那實際上是一次刪除，而規範 §6.2 要求刪除必寫稽核。
   * 沒有它的話，那批偏好會在沒有任何紀錄的情況下消失。
   */
  CIPHERTEXT_UNREADABLE: "CIPHERTEXT_UNREADABLE",
} as const;

export type FaithMemoryDeletionReason =
  (typeof FAITH_MEMORY_DELETION_REASON)[keyof typeof FAITH_MEMORY_DELETION_REASON];

/**
 * Info: (20260817 - Luphia) 每個 (userId, teamId) 的條目上限（規範 §4.2）。
 * 超限時淘汰 `updatedAt` 最舊者（LRU，決定論）。
 * 無上限的記憶會讓 prompt 無止境膨脹，而那直接反映在每輪的扣點上。
 */
export const FAITH_MEMORY_MAX_ITEMS = 50;

// Info: (20260817 - Luphia) 單一條目的字數上限（規範 §4.1）
export const FAITH_MEMORY_STATEMENT_MAX_CHARS = 200;

/**
 * Info: (20260817 - Luphia) 注入 prompt 的字元預算（規範 §5 的 token 預算換算）。
 *
 * 這是**硬上界**：超過即截斷，因此預扣估算仍為成本上界，
 * 「只退不補」的不變式維持成立。1,200 字元 ≈ 400 tokens。
 */
export const FAITH_MEMORY_PROMPT_MAX_CHARS = 1200;

/**
 * Info: (20260818 - Luphia) 萃取呼叫的輸出上界（第三輪 A-3）。
 *
 * 萃取要計費，而計費的前提是預扣算得出上界；輸出沒有上界就估不出來。
 * 一輪對話能明示的偏好本來就不多，512 tokens 綽綽有餘。
 */
export const FAITH_MEMORY_EXTRACTION_MAX_OUTPUT_TOKENS = 512;

// Info: (20260818 - Luphia) 萃取 prompt 的固定開銷（指令與分隔符），估算用
export const FAITH_MEMORY_EXTRACTION_OVERHEAD_TOKENS = 300;

/**
 * Info: (20260818 - Luphia) 萃取的逾時上限（第三輪 C-11）。
 *
 * 萃取跑在回覆之後、且被 `await`，因此它的耗時會**整段加進使用者感受到的延遲**。
 * 規範 §4.2 說它是「背景任務」，實際上是同步阻塞——真正的背景化需要一個工作佇列
 * （而且會讓它脫離本輪的計費範圍，那是 A-3 剛修好的東西）。
 *
 * 折衷是把最壞情況縮小：對話用的 45 秒是為了長回覆，而萃取的輸出上限只有
 * 512 tokens，用不到那麼久。逾時即放棄——萃取失敗本來就不影響回覆。
 */
export const FAITH_MEMORY_EXTRACTION_TIMEOUT_MS = 10_000;
