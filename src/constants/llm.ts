/**
 * Info: (20260716 - Tzuhan) LLM 同步路徑參數集中(issue #6515)。
 * 適用範圍:不經 mission executor 的同步 HTTP 路徑(carbon chat / draft / extraction)。
 * worker 管線的重試與用量記錄由檔案狀態機承擔(見 00.1_mission_executor_architecture.md),
 * 本檔常數不影響 executor 行為。
 */

// Info: (20260716 - Tzuhan) 模型 fallback 單一來源(原硬編於 chat.service.ts)
export const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

/**
 * Info: (20260716 - Tzuhan) 同步路徑後端逾時:
 * 前端 UI 30 秒放棄後,後端不得無限期掛著佔連線與費用。
 * chat 類 45 秒(給 UI 逾時留緩衝,回覆仍可經歷史回填送達);
 * 附件萃取 120 秒(14MB PDF inline 萃取本來就慢)。
 */
export const LLM_SYNC_TIMEOUT_MS = 45_000;
export const LLM_EXTRACTION_TIMEOUT_MS = 120_000;

// Info: (20260716 - Tzuhan) 溫度單一來源:萃取/撰寫 = 0(可重現),對話 = 0.2;禁止新增其他字面值
export const LLM_TEMPERATURE = {
  EXTRACTION: 0,
  CHAT: 0.2,
} as const;

/**
 * Info: (20260716 - Tzuhan) 用量記錄的 taskKey:欄位語意對齊 execution_log.json,
 * 讓同步路徑與 worker 管線的 token 成本可用同一套 schema 聚合歸因。
 */
export enum LlmTaskKeyEnum {
  CARBON_CHAT = "CARBON_CHAT",
  CARBON_GREETING = "CARBON_GREETING",
  PARAGRAPH_DRAFT = "PARAGRAPH_DRAFT",
  ATTACHMENT_EXTRACTION = "ATTACHMENT_EXTRACTION",
  // Info: (20260716 - Tzuhan) #56 整份報告匯入(切段對應大綱)
  REPORT_IMPORT = "REPORT_IMPORT",
}

/**
 * Info: (20260730 - Tzuhan) 輸出 token 上限:thinking 模型的思考 token 與正式輸出**共用**這個額度。
 * 實測(gemini-2.5-pro,高興昌 64 頁盤查報告逐章匯入):原本設 8192,
 *   第一章 思考 7923 + 輸出 254 = 8177 → 截斷
 *   第二章 思考 5255 + 輸出 2921 = 8176 → 截斷
 *   第三章 思考 8189 + 輸出 0    = 8189 → 完全沒有輸出
 *   第四章 思考 2466 + 輸出 5710 = 8176 → 截斷
 * 四章全數以「JSON 解析失敗」告終,而真因是額度被思考吃光。內容較少的第五~十一章則全部成功。
 * 逐字照抄本身就需要大輸出空間,再加上思考額度,8192 對整章匯入根本不夠。
 * gemini-2.5-pro 的輸出上限為 65536,此處取 32768:留足空間又不至於讓單次呼叫失控。
 */
export const LLM_MAX_OUTPUT_TOKENS = {
  // Info: (20260730 - Tzuhan) 整章逐字照抄:最耗輸出的任務
  REPORT_IMPORT: 32_768,
  // Info: (20260730 - Tzuhan) 其他生成任務維持原額度(未觀測到截斷)
  DEFAULT: 8_192,
} as const;

// Info: (20260730 - Tzuhan) 輸出被 token 上限截斷的識別標記:與「模型亂回」區分,前者可靠加大額度/縮小範圍解決
export const LLM_TRUNCATED_ERROR_MARKER = "LLM_OUTPUT_TRUNCATED";

// Info: (20260716 - Tzuhan) timeout 錯誤的識別標記(type guard 用,避免比對自由字串)
export const LLM_TIMEOUT_ERROR_MARKER = "LLM_TIMEOUT";
