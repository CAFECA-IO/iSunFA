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
// Info: (20260730 - Tzuhan) PDF 的 MIME:多處據此分流(逐章與否、是否可抽文字層),抽常數避免字面值散落
export const PDF_MIME_TYPE = "application/pdf";

export const IMPORT_CANDIDATE_MIME_TYPES: readonly string[] = [
  PDF_MIME_TYPE,
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
 * Info: (20260730 - Tzuhan) 結構圖生成的節流與重試。
 * 匯入完一份報告已用掉 11 章 + 最多 11 次 gap-fill 呼叫,LLM bucket 限流為 12 次/分鐘;
 * 緊接著再連發 5 次結構圖必然撞 429 —— 實測結果正是「前兩張畫出來,其餘無聲消失」。
 * 故逐張之間留間隔,遇額度不足再退避重試一次。
 */
export const CARBON_DIAGRAM_THROTTLE_MS = 6_000;
export const CARBON_DIAGRAM_QUOTA_RETRY_MS = 30_000;

/**
 * Info: (20260730 - Tzuhan) 整份報告匯入的三種模式。
 * 原本以 "draft" / "index" 字面值在 route 內比對,違反「拒絕魔法字串」——
 * 這些值同時是 API 契約(前端送、後端判),散落字面值任一端改字就靜默失效。
 */
export enum CarbonReportImportModeEnum {
  // Info: (20260716 - Tzuhan) 逐字照抄原文,對應標準大綱段落
  VERBATIM = "verbatim",
  // Info: (20260727 - Tzuhan) #57 對不上原文的段落改由 AI 撰寫草稿
  DRAFT = "draft",
  // Info: (20260730 - Tzuhan) 兩階段匯入的第一階段:只問各節起始頁碼
  INDEX = "index",
}

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

/**
 * Info: (20260806 - Tzuhan) 待匯入解析結果的持久化格式版本。
 * 與草稿分開編號:兩者是不同生命週期的資料,格式各自演進;
 * 版本不符時整筆丟棄(而非嘗試相容)—— 待匯入結果尚未落地,
 * 重新上傳解析一次即可,不值得為它背相容邏輯的風險。
 */
export const CARBON_PENDING_IMPORT_STORAGE_VERSION = 1;
export const buildCarbonReportDraftKey = (channel: string): string =>
  `carbon_report_draft_${channel}`;
export const buildCarbonSessionsIndexKey = (address: string): string =>
  `carbon_chat_sessions_${address}`;

// Info: (20260714 - Tzuhan) 報告草稿自動保存的 debounce 間隔(ms)
export const CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS = 2000;

/**
 * Info: (20260807 - Emily) 草稿內容上限(字元)。單一來源 —— validator(envelope.encryptedContent /
 * plainContent / rawMarkdown)與前端送出前的預檢都引這一個常數。
 *
 * 原本 2_000_000 這個數字在 validator 裡寫死三次,而前端完全不知道它存在:
 * 超過就是一個 400 VL_SCHEMA_ERROR,畫面上只剩一個「保存異常」小圖示,
 * 代價是幾分鐘的 LLM 成果無聲消失(issue_drafts/inventory_table_import/12)。
 */
export const CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS = 2_000_000;

/**
 * Info: (20260807 - Emily) ECIES + base64 的體積膨脹估計倍率。
 *
 * 上限管的是**密文**長度,而前端手上只有明文 —— 用明文長度去比 2M 會低估,
 * 於是「前端覺得沒超過、伺服端擋下來」。加密模式的預檢因此以
 * 上限 ÷ 本倍率 作為明文預算。取 1.4 是量測值(base64 固定 4/3,
 * 加上 ECIES 的固定標頭與 JSON 包裝)再留一點餘裕。
 */
export const CARBON_REPORT_DRAFT_ENCRYPTED_SIZE_RATIO = 1.4;

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

/**
 * Info: (20260805 - Tzuhan) 匯入完成的摘要訊息。
 *
 * 為什麼要有:匯入原本**全程不產生任何聊天訊息** —— 一份 64 頁的報告落地 33 個段落,
 * 對話裡卻只剩招呼語。使用者無從知道這個會話曾經匯入過什麼、對帳過不過、哪幾章失敗。
 * 段落層的 origin 會被編輯抹掉,報告層的 importedFrom 只有檔名與時間;
 * 「當時發生了什麼」需要一則按時序排在對話裡的記錄。
 *
 * Info: (20260805 - Tzuhan) 文案由**伺服端**組出而非前端傳入:
 * 入庫的內容是系統的陳述,不能讓呼叫端塞任意字串進使用者的對話紀錄。
 * 前端只送事實(檔名、節數、對帳結果),句子在這裡組。
 */
export enum CarbonImportReconciliationStateEnum {
  /** Info: (20260805 - Tzuhan) 表3.8 已入帳,三層勾稽通過 */
  RECONCILED = "RECONCILED",
  /** Info: (20260805 - Tzuhan) 有表3.8 但勾稽未過,一筆都沒入帳 */
  BLOCKED = "BLOCKED",
  /** Info: (20260805 - Tzuhan) 這次匯入沒有可入帳的表3.8 */
  NONE = "NONE",
}

export interface ICarbonImportSummary {
  fileName: string;
  /** Info: (20260805 - Tzuhan) 逐字匯入的段落數 */
  importedCount: number;
  /** Info: (20260805 - Tzuhan) 由 gap-fill 補寫的段落數 */
  draftedCount: number;
  reconciliation: CarbonImportReconciliationStateEnum;
  /** Info: (20260805 - Tzuhan) 解析失敗的章節標題;空陣列表示全部成功 */
  failedChapters: string[];
}

const IMPORT_RECONCILIATION_TEMPLATES: Record<
  string,
  Record<CarbonImportReconciliationStateEnum, string>
> = {
  "zh-TW": {
    RECONCILED: "表3.8 三層勾稽通過,已寫入帳本。",
    BLOCKED: "表3.8 勾稽未通過,一筆都沒有寫入帳本(見該節的對帳說明)。",
    NONE: "本次沒有可入帳的表3.8。",
  },
  "zh-CN": {
    RECONCILED: "表3.8 三层勾稽通过,已写入账本。",
    BLOCKED: "表3.8 勾稽未通过,一笔都没有写入账本(见该节的对账说明)。",
    NONE: "本次没有可入账的表3.8。",
  },
  en: {
    RECONCILED:
      "Table 3.8 passed all three reconciliation levels and was written to the ledger.",
    BLOCKED:
      "Table 3.8 failed reconciliation — nothing was written to the ledger (see the reconciliation note in that section).",
    NONE: "No ledger-eligible Table 3.8 in this import.",
  },
  ja: {
    RECONCILED: "表3.8 は三層の照合をすべて通過し、台帳に記録しました。",
    BLOCKED:
      "表3.8 の照合が通らなかったため、台帳には 1 件も記録していません（該当セクションの照合説明をご確認ください）。",
    NONE: "今回、台帳に記録できる表3.8 はありません。",
  },
  ko: {
    RECONCILED: "표3.8 이 3단계 대조를 모두 통과해 원장에 기록했습니다.",
    BLOCKED:
      "표3.8 대조가 통과하지 못해 원장에 한 건도 기록하지 않았습니다(해당 절의 대조 설명 참조).",
    NONE: "이번 가져오기에는 원장에 기록할 표3.8 이 없습니다.",
  },
};

/**
 * Info: (20260806 - Tzuhan) 匯入之後可以接下去做什麼(決定性列舉)。
 *
 * 匯入摘要原本是一段**單向的系統陳述**:講完就結束,對話停在那裡。
 * 而使用者匯入一份報告的目的不是「讓它躺在系統裡」,是要有人幫他看 ——
 * 以外部查證的標準檢視、分析排放結構、找出揭露缺口。
 * 摘要不接上這一步,就等於把「接下來呢」丟回給使用者自己想。
 *
 * **為什麼是固定列舉而不是讓 LLM 開場:**
 * 開場白若由 LLM 生成,它會順手概括「這份報告如何」——
 * 而它此刻只看到 33 段落的計數,沒看過內容,那個概括必然是捏造的。
 * 這裡只提供**可以做什麼**(系統確知的能力),不提供**報告怎麼樣**(要分析過才知道)。
 *
 * 三個選項各自對應一種真實需求,枚舉值同時是「使用者點下去會送出什麼」的鍵,
 * 讓摘要文案與輸入列上方的建議按鈕**共用同一份定義** —— 兩邊各寫一份遲早不一致,
 * 而不一致的表現是「按鈕做的事跟它上面那句話說的不一樣」。
 */
export enum CarbonImportFollowUpEnum {
  /** Info: (20260806 - Tzuhan) 以外部查證的標準逐項檢視(ISO 14064-1 必要揭露項) */
  EXTERNAL_REVIEW = "EXTERNAL_REVIEW",
  /** Info: (20260806 - Tzuhan) 分析排放結構(範疇/類別/廠址的占比與熱點) */
  ANALYZE_STRUCTURE = "ANALYZE_STRUCTURE",
  /** Info: (20260806 - Tzuhan) 找出揭露缺口與待補項 */
  FIND_GAPS = "FIND_GAPS",
}

// Info: (20260806 - Tzuhan) 選項順序固定(決定性):由嚴到寬 —— 先查核、再分析、再補缺
export const CARBON_IMPORT_FOLLOW_UPS: readonly CarbonImportFollowUpEnum[] = [
  CarbonImportFollowUpEnum.EXTERNAL_REVIEW,
  CarbonImportFollowUpEnum.ANALYZE_STRUCTURE,
  CarbonImportFollowUpEnum.FIND_GAPS,
];

/**
 * Info: (20260806 - Tzuhan) 後續選項的文案。**同時是使用者點下去送出的那句話** ——
 * 按鈕上的字與送出的內容一致,使用者才知道自己要求了什麼
 * (按鈕寫一句、實際送另一句,是對話紀錄裡最難查的一種不一致)。
 */
const IMPORT_FOLLOW_UP_TEMPLATES: Record<
  string,
  Record<CarbonImportFollowUpEnum, string>
> = {
  "zh-TW": {
    EXTERNAL_REVIEW: "以外部查證的標準逐項檢視這份報告,指出不符之處。",
    ANALYZE_STRUCTURE: "分析這份報告的排放結構,指出占比最高的熱點。",
    FIND_GAPS: "找出這份報告的揭露缺口與待補項。",
  },
  "zh-CN": {
    EXTERNAL_REVIEW: "以外部核查的标准逐项检视这份报告,指出不符之处。",
    ANALYZE_STRUCTURE: "分析这份报告的排放结构,指出占比最高的热点。",
    FIND_GAPS: "找出这份报告的披露缺口与待补项。",
  },
  en: {
    EXTERNAL_REVIEW:
      "Review this report against external verification criteria and point out non-conformities.",
    ANALYZE_STRUCTURE:
      "Analyse the emission structure of this report and identify the largest hotspots.",
    FIND_GAPS: "Identify the disclosure gaps and outstanding items.",
  },
  ja: {
    EXTERNAL_REVIEW:
      "外部検証の基準に沿ってこの報告書を項目ごとに点検し、不適合を指摘してください。",
    ANALYZE_STRUCTURE:
      "この報告書の排出構造を分析し、比率の高いホットスポットを指摘してください。",
    FIND_GAPS: "この報告書の開示ギャップと未対応項目を洗い出してください。",
  },
  ko: {
    EXTERNAL_REVIEW:
      "외부 검증 기준에 따라 이 보고서를 항목별로 점검하고 부적합 사항을 지적해 주세요.",
    ANALYZE_STRUCTURE:
      "이 보고서의 배출 구조를 분석하고 비중이 가장 큰 핫스팟을 지적해 주세요.",
    FIND_GAPS: "이 보고서의 공시 누락 항목과 보완 필요 항목을 찾아 주세요.",
  },
};

// Info: (20260806 - Tzuhan) 未知語系一律退回 zh-TW(與摘要同一慣例)
export const buildImportFollowUpPrompt = (
  language: string | undefined,
  followUp: CarbonImportFollowUpEnum,
): string =>
  (IMPORT_FOLLOW_UP_TEMPLATES[language ?? ""] ??
    IMPORT_FOLLOW_UP_TEMPLATES["zh-TW"])[followUp];

// Info: (20260806 - Tzuhan) 摘要末尾那句「接下來可以…」的抬頭
const IMPORT_FOLLOW_UP_HEADINGS: Record<string, string> = {
  "zh-TW": "接下來我可以幫你:",
  "zh-CN": "接下来我可以帮你:",
  en: "Next, I can help you:",
  ja: "次に、以下のお手伝いができます：",
  ko: "다음으로 이런 도움을 드릴 수 있습니다:",
};

/**
 * Info: (20260806 - Tzuhan) 把三個選項編號列在摘要末尾。
 * 編號是刻意的:使用者可以直接回「1」,不必把整句打出來 ——
 * 而按鈕不見得每次都在(捲動、行動版),編號在對話紀錄裡永遠都在。
 */
const buildFollowUpBlock = (language: string | undefined): string => {
  const heading =
    IMPORT_FOLLOW_UP_HEADINGS[language ?? ""] ??
    IMPORT_FOLLOW_UP_HEADINGS["zh-TW"];
  const options = CARBON_IMPORT_FOLLOW_UPS.map(
    (followUp, index) =>
      `${index + 1}. ${buildImportFollowUpPrompt(language, followUp)}`,
  );
  return [heading, ...options].join("\n");
};

const IMPORT_SUMMARY_TEMPLATES: Record<
  string,
  (summary: ICarbonImportSummary, reconciliation: string) => string
> = {
  "zh-TW": (s, reconciliation) =>
    [
      `已匯入「${s.fileName}」:逐字落地 ${s.importedCount} 節、AI 補寫草稿 ${s.draftedCount} 節。`,
      reconciliation,
      s.failedChapters.length > 0
        ? `以下章節解析失敗,可重新匯入補齊:${s.failedChapters.join("、")}。`
        : "",
      "匯入的內容一律標為未查核,請逐段確認後再定稿。",
    ]
      .filter(Boolean)
      .join("\n"),
  "zh-CN": (s, reconciliation) =>
    [
      `已导入「${s.fileName}」:逐字落地 ${s.importedCount} 节、AI 补写草稿 ${s.draftedCount} 节。`,
      reconciliation,
      s.failedChapters.length > 0
        ? `以下章节解析失败,可重新导入补齐:${s.failedChapters.join("、")}。`
        : "",
      "导入的内容一律标为未核对,请逐段确认后再定稿。",
    ]
      .filter(Boolean)
      .join("\n"),
  en: (s, reconciliation) =>
    [
      `Imported "${s.fileName}": ${s.importedCount} section(s) transcribed verbatim, ${s.draftedCount} drafted by AI.`,
      reconciliation,
      s.failedChapters.length > 0
        ? `These chapters failed to parse and can be re-imported: ${s.failedChapters.join(", ")}.`
        : "",
      "Everything imported is marked unverified — please review each section before finalising.",
    ]
      .filter(Boolean)
      .join("\n"),
  ja: (s, reconciliation) =>
    [
      `「${s.fileName}」をインポートしました：${s.importedCount} セクションを原文どおり、${s.draftedCount} セクションを AI が下書き。`,
      reconciliation,
      s.failedChapters.length > 0
        ? `次の章は解析に失敗しました。再インポートで補完できます：${s.failedChapters.join("、")}。`
        : "",
      "インポートした内容はすべて未確認として扱われます。各セクションをご確認のうえ確定してください。",
    ]
      .filter(Boolean)
      .join("\n"),
  ko: (s, reconciliation) =>
    [
      `「${s.fileName}」을(를) 가져왔습니다: ${s.importedCount}개 절은 원문 그대로, ${s.draftedCount}개 절은 AI 초안.`,
      reconciliation,
      s.failedChapters.length > 0
        ? `다음 장은 분석에 실패했습니다. 다시 가져와 보완할 수 있습니다: ${s.failedChapters.join(", ")}.`
        : "",
      "가져온 내용은 모두 미검증으로 표시됩니다. 각 절을 확인한 뒤 확정해 주세요.",
    ]
      .filter(Boolean)
      .join("\n"),
};

/**
 * Info: (20260806 - Tzuhan) 「解析完成、尚未匯入」的訊息。
 *
 * 為什麼與匯入摘要分成兩則:兩者陳述的是**不同的事實**。
 * 摘要說「已經寫進報告了」,這一則說「解析好了,還沒寫進去,你決定」——
 * 把兩者用同一句話含混帶過,使用者會以為內容已經在報告裡。
 *
 * 這則訊息存在的理由是使用者的實測:解析跑完幾分鐘,當下沒有按套用就什麼都不留,
 * 重載後對話裡沒有任何痕跡,而那幾分鐘的 LLM 呼叫也白燒了。
 * 訊息入庫(E2EE)+ 待匯入結果入庫,兩者一起才讓「稍後再決定」真的可行。
 */
export interface ICarbonImportParsedSummary {
  fileName: string;
  /** Info: (20260806 - Tzuhan) 待確認的逐字段落數 */
  pendingCount: number;
  /** Info: (20260806 - Tzuhan) 待確認的 AI 草稿段落數 */
  draftedCount: number;
  /** Info: (20260806 - Tzuhan) 一併解析出的活動數據筆數(尚未入帳) */
  activityCount: number;
  failedChapters: string[];
}

const IMPORT_PARSED_TEMPLATES: Record<
  string,
  (summary: ICarbonImportParsedSummary) => string
> = {
  "zh-TW": (s) =>
    [
      `報告解析完成:「${s.fileName}」。`,
      `待確認 ${s.pendingCount} 節逐字內容、${s.draftedCount} 節 AI 草稿,另有 ${s.activityCount} 筆活動數據。`,
      s.failedChapters.length > 0
        ? `以下章節解析失敗,可在預覽卡重試:${s.failedChapters.join("、")}。`
        : "",
      "解析結果已保存,尚未寫入報告 —— 你可以現在檢視並匯入,也可以稍後回到這個對話再決定。",
    ]
      .filter(Boolean)
      .join("\n"),
  "zh-CN": (s) =>
    [
      `报告解析完成:「${s.fileName}」。`,
      `待确认 ${s.pendingCount} 节逐字内容、${s.draftedCount} 节 AI 草稿,另有 ${s.activityCount} 笔活动数据。`,
      s.failedChapters.length > 0
        ? `以下章节解析失败,可在预览卡重试:${s.failedChapters.join("、")}。`
        : "",
      "解析结果已保存,尚未写入报告 —— 你可以现在查看并导入,也可以稍后回到这个对话再决定。",
    ]
      .filter(Boolean)
      .join("\n"),
  en: (s) =>
    [
      `Finished parsing "${s.fileName}".`,
      `${s.pendingCount} verbatim section(s) and ${s.draftedCount} AI draft(s) are waiting for your confirmation, plus ${s.activityCount} activity record(s).`,
      s.failedChapters.length > 0
        ? `These chapters failed to parse and can be retried from the preview card: ${s.failedChapters.join(", ")}.`
        : "",
      "The parsed result is saved but not yet written into the report — review and import it now, or come back to this conversation later.",
    ]
      .filter(Boolean)
      .join("\n"),
  ja: (s) =>
    [
      `「${s.fileName}」の解析が完了しました。`,
      `原文どおりの ${s.pendingCount} セクションと AI 下書き ${s.draftedCount} セクションが確認待ちです。活動データは ${s.activityCount} 件です。`,
      s.failedChapters.length > 0
        ? `次の章は解析に失敗しました。プレビューから再試行できます：${s.failedChapters.join("、")}。`
        : "",
      "解析結果は保存済みですが、報告書にはまだ書き込まれていません。今すぐ確認してインポートするか、後でこの会話に戻って決めることもできます。",
    ]
      .filter(Boolean)
      .join("\n"),
  ko: (s) =>
    [
      `「${s.fileName}」 분석을 완료했습니다.`,
      `원문 ${s.pendingCount}개 절과 AI 초안 ${s.draftedCount}개 절이 확인을 기다리고 있으며, 활동 데이터는 ${s.activityCount}건입니다.`,
      s.failedChapters.length > 0
        ? `다음 장은 분석에 실패했습니다. 미리보기에서 다시 시도할 수 있습니다: ${s.failedChapters.join(", ")}.`
        : "",
      "분석 결과는 저장되었지만 아직 보고서에 기록되지 않았습니다 — 지금 확인해 가져오거나, 나중에 이 대화로 돌아와 결정할 수 있습니다.",
    ]
      .filter(Boolean)
      .join("\n"),
};

// Info: (20260806 - Tzuhan) 未知語系一律退回 zh-TW(與摘要同一慣例)
export const buildImportParsedNotice = (
  language: string | undefined,
  summary: ICarbonImportParsedSummary,
): string =>
  (IMPORT_PARSED_TEMPLATES[language ?? ""] ?? IMPORT_PARSED_TEMPLATES["zh-TW"])(
    summary,
  );

/**
 * Info: (20260806 - Tzuhan) 匯入通知的種類。
 * 兩則訊息陳述不同的事實(已寫入 / 尚未寫入),故以 enum 明確區分,
 * 而不是靠欄位有無去猜 —— 靠猜的話,少送一個欄位就會說出錯的事實。
 */
export enum CarbonImportNoticeKindEnum {
  /** Info: (20260806 - Tzuhan) 解析完成、待人工確認(尚未寫入報告) */
  PARSED = "PARSED",
  /** Info: (20260806 - Tzuhan) 已套用寫入報告 */
  SUMMARY = "SUMMARY",
}

export const buildImportSummaryNotice = (
  language: string | undefined,
  summary: ICarbonImportSummary,
): string => {
  const key = language ?? "";
  const reconciliation = (IMPORT_RECONCILIATION_TEMPLATES[key] ??
    IMPORT_RECONCILIATION_TEMPLATES["zh-TW"])[summary.reconciliation];
  const template =
    IMPORT_SUMMARY_TEMPLATES[key] ?? IMPORT_SUMMARY_TEMPLATES["zh-TW"];
  /**
   * Info: (20260806 - Tzuhan) 摘要之後接上「接下來可以做什麼」。
   * 講完事實就停住等於把「接下來呢」丟回給使用者 ——
   * 而他匯入報告的目的本來就是要有人幫他看。
   */
  return [template(summary, reconciliation), "", buildFollowUpBlock(key)].join(
    "\n",
  );
};
