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

// Info: (20260714 - Tzuhan) 頻道組建與所有權檢查:前後端共用同一規則,防止跨用戶讀寫他人頻道
export const buildCarbonChatChannel = (
  address: string,
  sessionId: string,
): string => `${CARBON_CHAT_CHANNEL_PREFIX}-${address}-${sessionId}`;

// Info: (20260715 - Luphia) 位址為 hex，EIP-55 checksum 僅差在大小寫；兩端統一轉小寫比對，避免 checksum 格式差異誤拒合法擁有者
export const isCarbonChatChannelOwnedBy = (
  channel: string,
  address: string,
): boolean =>
  channel
    .toLowerCase()
    .startsWith(`${CARBON_CHAT_CHANNEL_PREFIX}-${address.toLowerCase()}-`);

// Info: (20260712 - Luphia) chatroom 用途分類標記（存於 Chatroom.purpose）
export const CARBON_CHAT_PURPOSE = "carbon_chatbot";

// Info: (20260712 - Luphia) 進入 channel 時給 AI 的前置 bootstrap 指令（內部用，不入庫、不顯示），用於產生開場招呼詞
export const CARBON_CHAT_GREETING_PROMPT =
  "（系統啟動）請以專業碳會計師身分向用戶打招呼，並詢問要盤查的企業名稱與年度。只問這一個核心問題。";

// Info: (20260712 - Luphia) 送出後等待 AI 回覆經 Centrifugo 回傳的逾時（ms）；逾時未收到即解除等待並提示，避免卡在 typing
export const CARBON_CHAT_REPLY_TIMEOUT_MS = 30000;

// Info: (20260716 - Tzuhan) 帶附件的回覆等待:chat route 內含附件萃取/草稿生成(多次 LLM 呼叫),
// Info: (20260716 - Tzuhan) 30 秒會在管線完成前誤報系統錯誤(UAT 實測);對齊 extraction 120s + 餘裕
export const CARBON_CHAT_REPLY_TIMEOUT_WITH_ATTACHMENTS_MS = 180_000;

/**
 * Info: (20260730 - Tzuhan) 匯入導流的候選型別:上傳單一此類文件即詢問「匯入整份報告」或「作為佐證附件」。
 * 原本以檔案大小猜測意圖(PDF ≥ 4MB / 文字檔 ≥ 64KB),但大小是壞代理——
 * 真實的 64 頁溫室氣體盤查報告書只有 2MB,永遠觸發不了導流,使用者被導進只取 3 節的附件管線,
 * 因而誤以為系統「只認得三節」。改為一律詢問:不猜意圖,由使用者決定,零額外呼叫。
 */
export const IMPORT_CANDIDATE_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "text/markdown",
  "text/plain",
];

/**
 * Info: (20260730 - Tzuhan) 單發全綱匯入的大小上限:超過此值改逐章呼叫(突破單次輸出上限)。
 * PDF 一律逐章(頁數與內容量無法由檔案大小推斷);純文字小檔才單發,省下 10 次呼叫。
 */
export const CARBON_IMPORT_SINGLE_CALL_MAX_BYTES = 64 * 1024;

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

// Info: (20260714 - Tzuhan) 聊天附件限制:允許的 MIME 白名單(佐證資料常見格式,影像比照 FaithAgent 放寬)、單檔大小上限與單則附件數上限
export const CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Info: (20260727 - Tzuhan) #57 純文字/Markdown:報告匯入常見格式(匯入 API 本已支援,補齊聊天入口)
  "text/plain",
  "text/markdown",
] as const;

export type CarbonChatAttachmentMimeType =
  (typeof CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES)[number];

// Info: (20260714 - Tzuhan) 比照 FaithAgent 不擋一般大檔;50MB 為保護記憶體的軟上限(JSON base64 傳輸)
export const CARBON_CHAT_MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

// Info: (20260716 - Tzuhan) 位元組換算基數（1 GiB），供配額 GB → BigInt bytes 換算
const BYTES_PER_GB = BigInt(1024 ** 3);

/**
 * Info: (20260716 - Tzuhan) 每使用者（address）附件儲存配額，依訂閱方案分階（#6517）。
 * 對應 SUBSCRIPTION_PLAN_PRICE 的 free/team/business 三階，顯示於 /pricing/subscription。
 * 刻意用常數而非 env: .env 受 FIDO2 簽章鎖定（admin_setup_whitepaper.md），
 * 新增 env key 需超管重簽儀式；配額調整走 code change + release，留下可稽核軌跡。
 * GB 為單一數值來源（前端顯示用），bytes 由其換算（BigInt 對齊 numerical_precision_guideline，
 * 累計值與 DB BigInt 欄位同型別比較）。
 */
export const CARBON_STORAGE_QUOTA_GB_BY_PLAN = {
  free: 5,
  team: 20,
  business: 50,
} as const;

export const CARBON_STORAGE_QUOTA_BYTES_BY_PLAN = {
  free: BigInt(CARBON_STORAGE_QUOTA_GB_BY_PLAN.free) * BYTES_PER_GB,
  team: BigInt(CARBON_STORAGE_QUOTA_GB_BY_PLAN.team) * BYTES_PER_GB,
  business: BigInt(CARBON_STORAGE_QUOTA_GB_BY_PLAN.business) * BYTES_PER_GB,
} as const;

// Info: (20260716 - Tzuhan) 目前上傳強制執行採單一預設（free 階）；依方案分階強制執行為後續 issue
export const CARBON_STORAGE_QUOTA_BYTES =
  CARBON_STORAGE_QUOTA_BYTES_BY_PLAN.free;
export const CARBON_CHAT_MAX_ATTACHMENTS_PER_MESSAGE = 5;

// Info: (20260714 - Tzuhan) Gemini inlineData 單請求約 20MB 上限;超過此安全值的附件直接走降級(不送必失敗的萃取呼叫)
export const CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES = 14 * 1024 * 1024;

// Info: (20260714 - Tzuhan) file input 的 accept 屬性(與 MIME 白名單同步)
export const CARBON_CHAT_ATTACHMENT_ACCEPT =
  CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES.join(",");

/**
 * Info: (20260730 - Tzuhan) 聊天面板的三段尺寸。
 * COLLAPSED 圖示 → FLOATING 浮層(預設)→ DOCKED 右側欄。
 * 為什麼不是「浮層 or dock」二選一:浮層適合邊看報告邊問一句,dock 適合長對話與逐段對照,
 * 兩種情境都真實存在,所以由使用者切換而非我們替他決定。
 */
export enum CarbonChatPanelSizeEnum {
  COLLAPSED = "collapsed",
  FLOATING = "floating",
  DOCKED = "docked",
}

/**
 * Info: (20260730 - Tzuhan) 段落內容的來源。審計文件的底線:AI 寫的與原文照抄的不能混為一談。
 * 原本兩者都只是 isCompleted=true,gap-fill 把對不上的節全填成 AI 草稿後進度會顯示 33/33,
 * 但其中有幾節其實是模型依撰寫目標寫的骨架(內含「(待補: …)」佔位),看報告的人分辨不出來。
 */
export enum ParagraphOriginEnum {
  // Info: (20260730 - Tzuhan) 自上傳文件逐字照抄
  IMPORTED = "imported",
  // Info: (20260730 - Tzuhan) AI 依原文撰寫(gap-fill / 對話草稿):事實出自原文但文字經改寫
  AI_DRAFT = "ai_draft",
  // Info: (20260730 - Tzuhan) 使用者親手編輯
  MANUAL = "manual",
}

// Info: (20260714 - Tzuhan) 附件→段落管線:單次生成段落數上限(控制延遲與 token 成本)
export const CARBON_ATTACHMENT_PIPELINE_MAX_PARAGRAPHS = 3;

// Info: (20260714 - Tzuhan) 對話↔報告雙向連動:報告段落錨點 data attribute(以順序法注入 h3,取代標題文字比對)
export const CARBON_REPORT_PARAGRAPH_ATTR = "data-paragraph-id";

// Info: (20260714 - Tzuhan) 段落高亮與訊息閃爍的持續時間(ms)與高亮底色(orange-100)
export const CARBON_CHAT_HIGHLIGHT_DURATION_MS = 2000;
export const CARBON_REPORT_HIGHLIGHT_COLOR = "#ffedd5";
// Info: (20260714 - Tzuhan) 高亮元素標記 attribute;下載 PDF 前依此清除,避免高亮滲入輸出
export const CARBON_REPORT_HIGHLIGHTED_ATTR = "data-carbon-highlighted";

// Info: (20260714 - Tzuhan) 碳報告下載檔名:iSunFA_CarbonReport_{標題}_{YYYYMMDD}.pdf
export const buildCarbonReportFileName = (title: string): string => {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const safeTitle =
    title.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40) || "Report";
  return `iSunFA_CarbonReport_${safeTitle}_${ymd}.pdf`;
};

// Info: (20260714 - Tzuhan) 報告草稿與 session 索引的 localStorage key 與 schema 版本
// Info: (20260715 - Luphia) 草稿權威來源已是 DB(E2EE);此 key 改作「未存檔安全快取」——編輯後即寫入本機,DB 確認保存後立即刪除,避免 debounce 保存前發生意外(當機/關頁)導致內容丟失
export const CARBON_REPORT_DRAFT_STORAGE_VERSION = 1;
export const buildCarbonReportDraftKey = (channel: string): string =>
  `carbon_report_draft_${channel}`;
export const buildCarbonSessionsIndexKey = (address: string): string =>
  `carbon_chat_sessions_${address}`;

// Info: (20260714 - Tzuhan) 報告草稿自動保存的 debounce 間隔(ms)
export const CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS = 2000;

// Info: (20260714 - Tzuhan) 草稿狀態列錯誤提示的自動消失時間(ms)
export const CARBON_DRAFT_NOTICE_DISMISS_MS = 8000;

// Info: (20260714 - Tzuhan) 附件對應不到任何段落時的預設落點(2.2 溫室氣體排放源鑑別)
export const CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID = "ch2-2";

// Info: (20260714 - Tzuhan) 附件草稿摘要訊息模板(後端決定性產生,不經 LLM);key 對齊前端 Language 型別
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

// Info: (20260714 - Tzuhan) 對話蒐集完成後寫入段落的摘要訊息模板(決定性產生,不經 LLM)
const CHAT_DRAFT_SUMMARY_TEMPLATES: Record<
  string,
  (sections: string) => string
> = {
  "zh-TW": (sections) =>
    `已完成段落草稿並寫入報告：${sections}。請於報告預覽檢視並查核。`,
  "zh-CN": (sections) =>
    `已完成段落草稿并写入报告：${sections}。请于报告预览查看并核对。`,
  en: (sections) =>
    `Section draft completed and written to the report: ${sections}. Please review it in the report preview.`,
  ja: (sections) =>
    `セクション下書きを作成しレポートに反映しました:${sections}。レポートプレビューでご確認ください。`,
  ko: (sections) =>
    `섹션 초안을 작성하여 보고서에 반영했습니다: ${sections}. 보고서 미리보기에서 확인해 주세요.`,
};

export const buildChatDraftSummary = (
  language: string | undefined,
  sections: string,
): string => {
  const template =
    CHAT_DRAFT_SUMMARY_TEMPLATES[language ?? ""] ??
    CHAT_DRAFT_SUMMARY_TEMPLATES["zh-TW"];
  return template(sections);
};

// Info: (20260730 - Tzuhan) 逐段推播的階段訊息模板(決定性產生,不經 LLM)
// Info: (20260730 - Tzuhan) 動機:附件→段落管線一次要跑「萃取 + N 段草稿」(實測 36.8s + 3×17s ≈ 87s),
// Info: (20260730 - Tzuhan) 而 gateway 的 proxy_read_timeout 預設 60s,使用者只會看到 504 與「系統錯誤」。
// Info: (20260730 - Tzuhan) 改為每完成一個單元就經 Centrifugo 推一則訊息,結果不再依賴那條 HTTP 連線活著。
const ATTACHMENT_EXTRACTED_TEMPLATES: Record<
  string,
  (fileCount: number, sectionCount: number) => string
> = {
  "zh-TW": (fileCount, sectionCount) =>
    `已讀完 ${fileCount} 個附件,接下來逐段撰寫 ${sectionCount} 個段落草稿,完成一段就會即時出現。`,
  "zh-CN": (fileCount, sectionCount) =>
    `已读完 ${fileCount} 个附件,接下来逐段撰写 ${sectionCount} 个段落草稿,完成一段就会即时出现。`,
  en: (fileCount, sectionCount) =>
    `Finished reading ${fileCount} attachment(s). Now drafting ${sectionCount} section(s) — each will appear as soon as it is ready.`,
  ja: (fileCount, sectionCount) =>
    `${fileCount} 件の添付ファイルを読み終えました。これから ${sectionCount} セクションの下書きを順に作成し、完成ごとに表示します。`,
  ko: (fileCount, sectionCount) =>
    `첨부파일 ${fileCount}건을 모두 읽었습니다. 이제 ${sectionCount}개 섹션 초안을 순서대로 작성하며, 완료되는 대로 표시됩니다.`,
};

export const buildAttachmentExtractedNotice = (
  language: string | undefined,
  fileCount: number,
  sectionCount: number,
): string => {
  const template =
    ATTACHMENT_EXTRACTED_TEMPLATES[language ?? ""] ??
    ATTACHMENT_EXTRACTED_TEMPLATES["zh-TW"];
  return template(fileCount, sectionCount);
};

const DRAFT_PROGRESS_TEMPLATES: Record<
  string,
  (title: string, current: number, total: number) => string
> = {
  "zh-TW": (title, current, total) =>
    `已完成草稿(${current}/${total}):${title}。已寫入報告,請查核。`,
  "zh-CN": (title, current, total) =>
    `已完成草稿(${current}/${total}):${title}。已写入报告,请核对。`,
  en: (title, current, total) =>
    `Draft ${current} of ${total} completed: ${title}. Written to the report — please review.`,
  ja: (title, current, total) =>
    `下書き ${current}/${total} が完成しました：${title}。レポートに反映済みです。ご確認ください。`,
  ko: (title, current, total) =>
    `초안 ${current}/${total} 완료: ${title}. 보고서에 반영했습니다. 확인해 주세요.`,
};

export const buildDraftProgressNotice = (
  language: string | undefined,
  title: string,
  current: number,
  total: number,
): string => {
  const template =
    DRAFT_PROGRESS_TEMPLATES[language ?? ""] ??
    DRAFT_PROGRESS_TEMPLATES["zh-TW"];
  return template(title, current, total);
};
