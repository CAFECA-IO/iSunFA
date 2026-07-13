// Info: (20260712 - Luphia) Carbon Chatbot 共用常數（非 mock 資料）

// Info: (20260712 - Luphia) 預設開啟的盤查 session id（須與 INITIAL_SESSIONS 的預設 session 一致）
export const DEFAULT_SESSION_ID = "2025";

// Info: (20260712 - Luphia) 進度條數值：使用者送出訊息後的上限與增量
export const USER_PROGRESS_MAX = 80;
export const USER_PROGRESS_STEP = 15;

// Info: (20260712 - Luphia) 進度條數值：session 進度上限與 AI 回覆的增量
export const SESSION_PROGRESS_MAX = 95;
export const AI_REPLY_PROGRESS_STEP = 10;

// Info: (20260712 - Luphia) chatroom 頻道前綴；完整頻道為 `${prefix}-${用戶 address}-${sessionId}`，隔離不同用戶與不同 session
export const CARBON_CHAT_CHANNEL_PREFIX = "carbon-chat";

// Info: (20260712 - Luphia) chatroom 用途分類標記（存於 Chatroom.purpose）
export const CARBON_CHAT_PURPOSE = "carbon_chatbot";

// Info: (20260712 - Luphia) 進入 channel 時給 AI 的前置 bootstrap 指令（內部用，不入庫、不顯示），用於產生開場招呼詞
export const CARBON_CHAT_GREETING_PROMPT =
  "（系統啟動）請以專業碳會計師身分向用戶打招呼，並詢問要盤查的企業名稱與年度。只問這一個核心問題。";

// Info: (20260712 - Luphia) 送出後等待 AI 回覆經 Centrifugo 回傳的逾時（ms）；逾時未收到即解除等待並提示，避免卡在 typing
export const CARBON_CHAT_REPLY_TIMEOUT_MS = 30000;

// Info: (20260712 - Luphia) 送給 AI 的對話上下文只取最近 N 則，控制 token 成本與延遲（不影響畫面顯示的完整歷史）
export const CARBON_CHAT_AI_CONTEXT_SIZE = 20;

// Info: (20260712 - Luphia) 盤查步驟狀態機；推進由確定性 TS 規則判斷，不交給 LLM
export enum CarbonInventoryStep {
  ORG_PROFILE = "ORG_PROFILE", // Info: (20260712 - Luphia) 企業名稱、年度
  ORG_BOUNDARY = "ORG_BOUNDARY", // Info: (20260712 - Luphia) 組織邊界（控制權/股權法）
  EMISSION_SOURCES = "EMISSION_SOURCES", // Info: (20260712 - Luphia) 排放源鑑別
  ACTIVITY_DATA = "ACTIVITY_DATA", // Info: (20260712 - Luphia) 活動數據蒐集
  EMISSION_FACTORS = "EMISSION_FACTORS", // Info: (20260712 - Luphia) 排放係數對應
  REVIEW = "REVIEW", // Info: (20260712 - Luphia) 勾稽與覆核
  COMPLETED = "COMPLETED",
}

// Info: (20260712 - Luphia) 步驟先後順序（供決定性推進）
export const CARBON_INVENTORY_STEP_ORDER: CarbonInventoryStep[] = [
  CarbonInventoryStep.ORG_PROFILE,
  CarbonInventoryStep.ORG_BOUNDARY,
  CarbonInventoryStep.EMISSION_SOURCES,
  CarbonInventoryStep.ACTIVITY_DATA,
  CarbonInventoryStep.EMISSION_FACTORS,
  CarbonInventoryStep.REVIEW,
  CarbonInventoryStep.COMPLETED,
];

// Info: (20260712 - Luphia) 結構化狀態 schema 版本（便於未來遷移）
export const CARBON_INVENTORY_STATE_VERSION = 1;
