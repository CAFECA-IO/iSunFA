/**
 * Info: (20260716 - Emily) LLM 同步路徑參數集中(issue #6515)。
 * 適用範圍:不經 mission executor 的同步 HTTP 路徑(carbon chat / draft / extraction)。
 * worker 管線的重試與用量記錄由檔案狀態機承擔(見 00.1_mission_executor_architecture.md),
 * 本檔常數不影響 executor 行為。
 */

// Info: (20260716 - Emily) 模型 fallback 單一來源(原硬編於 chat.service.ts)
export const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

/**
 * Info: (20260716 - Emily) 同步路徑後端逾時:
 * 前端 UI 30 秒放棄後,後端不得無限期掛著佔連線與費用。
 * chat 類 45 秒(給 UI 逾時留緩衝,回覆仍可經歷史回填送達);
 * 附件萃取 120 秒(14MB PDF inline 萃取本來就慢)。
 */
export const LLM_SYNC_TIMEOUT_MS = 45_000;
export const LLM_EXTRACTION_TIMEOUT_MS = 120_000;

// Info: (20260716 - Emily) 溫度單一來源:萃取/撰寫 = 0(可重現),對話 = 0.2;禁止新增其他字面值
export const LLM_TEMPERATURE = {
  EXTRACTION: 0,
  CHAT: 0.2,
} as const;

/**
 * Info: (20260716 - Emily) 用量記錄的 taskKey:欄位語意對齊 execution_log.json,
 * 讓同步路徑與 worker 管線的 token 成本可用同一套 schema 聚合歸因。
 */
export enum LlmTaskKeyEnum {
  CARBON_CHAT = "CARBON_CHAT",
  CARBON_GREETING = "CARBON_GREETING",
  PARAGRAPH_DRAFT = "PARAGRAPH_DRAFT",
  ATTACHMENT_EXTRACTION = "ATTACHMENT_EXTRACTION",
}

// Info: (20260716 - Emily) timeout 錯誤的識別標記(type guard 用,避免比對自由字串)
export const LLM_TIMEOUT_ERROR_MARKER = "LLM_TIMEOUT";
