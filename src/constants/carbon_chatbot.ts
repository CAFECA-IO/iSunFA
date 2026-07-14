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

// Info: (20260714 - Emily) 頻道組建與所有權檢查:前後端共用同一規則,防止跨用戶讀寫他人頻道
export const buildCarbonChatChannel = (
  address: string,
  sessionId: string,
): string => `${CARBON_CHAT_CHANNEL_PREFIX}-${address}-${sessionId}`;

export const isCarbonChatChannelOwnedBy = (
  channel: string,
  address: string,
): boolean => channel.startsWith(`${CARBON_CHAT_CHANNEL_PREFIX}-${address}-`);

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

// Info: (20260713 - Tzuhan) 行動版斷點判斷(對齊 Tailwind xl = 1280px):< xl 時目錄/報告採獨占畫面呈現
export const MOBILE_MEDIA_QUERY = "(max-width: 1279px)";

// Info: (20260714 - Emily) 聊天附件限制:允許的 MIME 白名單(佐證資料常見格式)、單檔大小上限與單則訊息附件數上限
export const CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export type CarbonChatAttachmentMimeType =
  (typeof CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES)[number];

export const CARBON_CHAT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const CARBON_CHAT_MAX_ATTACHMENTS_PER_MESSAGE = 5;

// Info: (20260714 - Emily) file input 的 accept 屬性(與 MIME 白名單同步)
export const CARBON_CHAT_ATTACHMENT_ACCEPT =
  CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES.join(",");

// Info: (20260714 - Emily) 附件→段落管線:單次生成段落數上限(控制延遲與 token 成本)
export const CARBON_ATTACHMENT_PIPELINE_MAX_PARAGRAPHS = 3;

// Info: (20260714 - Emily) 對話↔報告雙向連動:報告段落錨點 data attribute(以順序法注入 h3,取代標題文字比對)
export const CARBON_REPORT_PARAGRAPH_ATTR = "data-paragraph-id";

// Info: (20260714 - Emily) 段落高亮與訊息閃爍的持續時間(ms)與高亮底色(orange-100)
export const CARBON_CHAT_HIGHLIGHT_DURATION_MS = 2000;
export const CARBON_REPORT_HIGHLIGHT_COLOR = "#ffedd5";
// Info: (20260714 - Emily) 高亮元素標記 attribute;下載 PDF 前依此清除,避免高亮滲入輸出
export const CARBON_REPORT_HIGHLIGHTED_ATTR = "data-carbon-highlighted";

// Info: (20260714 - Emily) 碳報告下載檔名:iSunFA_CarbonReport_{標題}_{YYYYMMDD}.pdf
export const buildCarbonReportFileName = (title: string): string => {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const safeTitle =
    title.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40) || "Report";
  return `iSunFA_CarbonReport_${safeTitle}_${ymd}.pdf`;
};

// Info: (20260714 - Emily) 報告草稿與 session 索引的 localStorage key 與 schema 版本
// ToDo: (20260714 - Emily) 後續 DB 化(CarbonReportDraft model + GET/PUT /api/v1/chat/carbon/report)時移除本機儲存
export const CARBON_REPORT_DRAFT_STORAGE_VERSION = 1;
export const buildCarbonReportDraftKey = (channel: string): string =>
  `carbon_report_draft_${channel}`;
export const buildCarbonSessionsIndexKey = (address: string): string =>
  `carbon_chat_sessions_${address}`;

// Info: (20260714 - Emily) 報告草稿自動保存的 debounce 間隔(ms)
export const CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS = 2000;

// Info: (20260714 - Emily) 附件對應不到任何段落時的預設落點(2.2 溫室氣體排放源鑑別)
export const CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID = "ch2-2";

// Info: (20260714 - Emily) 附件草稿摘要訊息模板(後端決定性產生,不經 LLM);key 對齊前端 Language 型別
const ATTACHMENT_SUMMARY_TEMPLATES: Record<
  string,
  (count: number, sections: string, degraded: boolean) => string
> = {
  "zh-TW": (count, sections, degraded) =>
    `已根據附件生成 ${count} 個段落草稿：${sections}。請於報告預覽檢視並查核。${degraded ? "（部分附件解析降級，以通用範本生成，請人工確認內容）" : ""}`,
  "zh-CN": (count, sections, degraded) =>
    `已根据附件生成 ${count} 个段落草稿：${sections}。请于报告预览查看并核对。${degraded ? "（部分附件解析降级，以通用范本生成，请人工确认内容）" : ""}`,
  en: (count, sections, degraded) =>
    `Generated ${count} section draft(s) from your attachment(s): ${sections}. Please review them in the report preview.${degraded ? " (Some attachments could not be fully parsed; generic templates were used — please verify the content.)" : ""}`,
  ja: (count, sections, degraded) =>
    `添付ファイルから ${count} 件のセクション下書きを生成しました：${sections}。レポートプレビューでご確認ください。${degraded ? "（一部の添付ファイルは解析できなかったため汎用テンプレートで生成しました。内容をご確認ください。）" : ""}`,
  ko: (count, sections, degraded) =>
    `첨부파일을 기반으로 ${count}개의 섹션 초안을 생성했습니다: ${sections}. 보고서 미리보기에서 확인해 주세요.${degraded ? " (일부 첨부파일은 완전히 해석하지 못해 일반 템플릿으로 생성했습니다. 내용을 확인해 주세요.)" : ""}`,
};

export const buildAttachmentDraftSummary = (
  language: string | undefined,
  count: number,
  sections: string,
  degraded: boolean,
): string => {
  const template =
    ATTACHMENT_SUMMARY_TEMPLATES[language ?? ""] ??
    ATTACHMENT_SUMMARY_TEMPLATES["zh-TW"];
  return template(count, sections, degraded);
};
