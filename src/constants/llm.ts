/**
 * Info: (20260716 - Tzuhan) LLM 同步路徑參數集中(issue #6515)。
 * 適用範圍:不經 mission executor 的同步 HTTP 路徑(carbon chat / draft / extraction)。
 * worker 管線的重試與用量記錄由檔案狀態機承擔(見 00.1_mission_executor_architecture.md)。
 */

/**
 * Info: (20260811 - Luphia) 原本這裡寫著「本檔常數不影響 executor 行為」,那句話已不成立:
 * LLM_WORKER_TIMEOUT_MS 就是給 executor 用的。理由見該常數的說明——
 * 「檔案狀態機承擔重試」這個前提隱含「執行一定會結束」,而沒有逾時的呼叫不保證會結束。
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

/**
 * Info: (20260811 - Luphia) mission executor(worker 管線)的 LLM 逾時上限。
 *
 * ── 為什麼 worker 也需要逾時 ──
 * executor 的重試機制是檔案狀態機:失敗時寫 `failed_*.md`,累積 3 個就停止重試。
 * 那個設計隱含一個前提——**執行一定會結束**。而在此之前 worker 路徑完全沒有逾時
 * (只有同步 HTTP 路徑有),因此 LLM 呼叫掛住時:
 *   - 不會拋錯,所以不會寫 `failed_*.md`,3 次上限永遠不會被觸發
 *   - finally 不會執行,所以執行鎖不會被釋放
 *   - 該 mission 因此無聲停擺,而 log 上看不出任何異常
 * 20260811 的 mission 288 就停在這個狀態。逾時是讓「重試」這件事有意義的前提。
 *
 * ── 為什麼是 180 秒 ──
 * 它是上限而非期望值。worker 的單次呼叫多在數十秒內完成,最重的是帶多張圖的憑證解析;
 * 180 秒給足空間,同時保證失敗會在三分鐘內被記錄下來、鎖會被釋放、mission 會進入重試。
 * 整份報告匯入那條路徑另有 LLM_REPORT_IMPORT_TIMEOUT_MS(240 秒),不受此值約束。
 */
export const LLM_WORKER_TIMEOUT_MS = 180_000;

/**
 * Info: (20260730 - Tzuhan) 整份報告匯入的逾時:與附件萃取分開。
 * 實測(64 頁盤查報告逐章匯入)輸出額度從 8,192 提高到 32,768 後,模型有空間完整照抄,
 * 單章耗時隨之從 ~53s 拉長到 ~71s,第二章更直接撞上 120s 逾時 —— 額度放寬後,逾時成為新的瓶頸。
 * 逐字照抄整章本質上就是慢工,240s 給足空間;真正的收斂要靠減少每次呼叫的輸入量(見 ADR 014)。
 */
export const LLM_REPORT_IMPORT_TIMEOUT_MS = 240_000;

/**
 * Info: (20260803 - Tzuhan) 結構圖萃取的逾時:與 chat 分開。
 *
 * 原本沿用 LLM_SYNC_TIMEOUT_MS(45s),但那個 45 秒的理由是「前端 UI 30 秒放棄後
 * 留一點緩衝」—— 那是對話回覆的期限。結構圖是匯入後的加值步驟,沒有 30 秒的 UI 期限,
 * 借用對話的期限等於把不相干的約束套進來。
 *
 * 實測代價:1.1 節(經營沿革時間軸,原文 23 個里程碑)第一次 latencyMs 45,003 逾時,
 * 退避重試 44,992 才過 —— 8 毫秒的差距。靠 8 毫秒成立的功能等於擲硬幣。
 * 90s 給推理型模型處理最長的那張圖留足空間;它仍是上限而非期望值(其餘四張都在 12s 內)。
 */
export const LLM_DIAGRAM_TIMEOUT_MS = 90_000;

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
  // Info: (20260730 - Tzuhan) 結構圖節點萃取(敘述 → 節點+父子關係,mermaid 由模板組出)
  DIAGRAM_EXTRACTION = "DIAGRAM_EXTRACTION",
  // Info: (20260807 - Luphia) 費思對話（計費，設計書 §5.3）
  FAITH_CHAT = "FAITH_CHAT",
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
  /**
   * Info: (20260807 - Emily) 整章逐字照抄:最耗輸出的任務。
   *
   * 32,768 在 UAT 實測不夠。高興昌那份報告的第三章(pages 43–63,17,666 字)量到:
   * input 19,626 / output 9,343 / total 52,379 —— 相減得出**思考用掉 23,410**,
   * 23,410 + 9,343 = 32,753,幾乎正好貼著 32,768 的上限。
   *
   * 也就是說擋住的不是輸出量,是思考量,而思考長度不是我們能預測的
   * (同一份檔案跑兩次可以差好幾千)。把額度提到 gemini-2.5-pro 的上限 65,536,
   * 讓思考有波動的空間 —— 逐字照抄本來就是輸出最重的任務,省這個額度沒有意義,
   * 代價是整章解析失敗、使用者得手動重試。
   */
  REPORT_IMPORT: 65_536,
  // Info: (20260730 - Tzuhan) 其他生成任務維持原額度(未觀測到截斷)
  DEFAULT: 8_192,
} as const;

// Info: (20260730 - Tzuhan) 輸出被 token 上限截斷的識別標記:與「模型亂回」區分,前者可靠加大額度/縮小範圍解決
export const LLM_TRUNCATED_ERROR_MARKER = "LLM_OUTPUT_TRUNCATED";

// Info: (20260716 - Tzuhan) timeout 錯誤的識別標記(type guard 用,避免比對自由字串)
export const LLM_TIMEOUT_ERROR_MARKER = "LLM_TIMEOUT";

/**
 * Info: (20260812 - Luphia) 完全取不到 LLM 金鑰的識別標記。
 *
 * 之前上層是用 `error.message.includes("GEMINI_API_KEY")` 認這個成因 ——
 * 比對的是一段可以被任何人改掉的自由字串,而 `IS_GEMINI_API_KEY_UNDEFINED`
 * 這個錯誤碼早就定義好、卻沒有任何地方使用。與另外兩個標記同一種做法。
 */
export const LLM_KEY_MISSING_ERROR_MARKER = "LLM_KEY_MISSING";

/**
 * Info: (20260803 - Tzuhan) 傳輸層失敗的重試次數與退避(僅用於「沒送到」的錯誤)。
 *
 * 只重試傳輸失敗是刻意的:截斷與 schema 無效重送同一份輸入必得同樣結果,
 * 重試只會把一次必然的失敗變成三次,還多付兩次 token。
 *
 * 2 次(共 3 次嘗試)、間隔 3 秒:實測的中斷是短暫的(同一分鐘內其他章仍成功),
 * 而逐章匯入單章本來就要一到兩分鐘,再加幾秒退避對總時長無感。
 */
export const LLM_TRANSPORT_RETRY_ATTEMPTS = 2;
export const LLM_TRANSPORT_RETRY_DELAY_MS = 3_000;

export interface IFaithBillingSetting {
  // Info: (20260809 - Luphia) 每 N tokens（input + thinking + output 合計）扣 1 點
  tokensPerCredit: number;
  // Info: (20260809 - Luphia) 成本上界：thinking token 與正式輸出共用此額度（見上方實測）
  maxOutputTokens: number;
  // Info: (20260809 - Luphia) 預扣估算用：帶圖時的輸入 token 估值
  imageInputTokenEstimate: number;
}

/**
 * Info: (20260809 - Luphia) 費思對話計費設定的**預設值**（設計書 §5.3，產品拍板 2026-08-07）。
 *
 * 正式值為系統設定，保存於 DB 的 `FaithBillingSetting` 表（可由後台調整、留變更軌跡、
 * 多實例一致），本常數僅在查無設定列時作為 fail-safe 預設。
 * **嚴禁改回 env 覆寫**——營運設定不屬部署參數，且非 NEXT_PUBLIC_ 的環境變數
 * 在 client bundle 讀不到，會使 server 與 client 算出不同結果。
 *
 * 計費規則：無條件進位、每輪最低 1 點。服務條款 §3.4 刻意不載明費率數字
 * （設定可由後台調整，寫死條款會失準），改以「服務內公告」為準——
 * 該公告的正式落點尚待產品與法務指定，見設計書 §5.3 待辦。
 */
export const DEFAULT_FAITH_BILLING: IFaithBillingSetting = {
  tokensPerCredit: 1000,
  maxOutputTokens: 4096,
  imageInputTokenEstimate: 2000,
};

/**
 * Info: (20260807 - Luphia) 預扣估算的內部係數（非營運設定，不進 DB）：
 * 系統 prompt 上界（最大分支 ~1750 字元）與「3 字元 ≈ 1 token」的估算基準，
 * 兩者皆繫於 prompt 實作與模型分詞行為，隨程式碼一起版控才有意義。
 */
export const FAITH_PROMPT_OVERHEAD_TOKENS = 600;
export const FAITH_INPUT_CHARS_PER_TOKEN = 3;

/**
 * Info: (20260817 - Luphia) 任務短期記憶的上界（條款 §3.7「所有方案皆具備」）。
 *
 * 對話前文由 client 傳上來（費思不寫 DB，聊天室訊息又是端對端加密，
 * server 讀不到前文），因此必須有一個硬上界——它同時是 prompt 長度的上界
 * 與預扣估算的依據。沒有上界的話，呼叫端送多長的歷史就扣多少點，
 * 而預扣是「成本上界」這個不變式會直接失效。
 *
 * 10 輪 / 4,000 字元約當 1,333 tokens，以 1 點 = 1,000 tokens 計，
 * 最多讓每則訊息多扣約 2 點。
 */
export const FAITH_HISTORY_MAX_TURNS = 10;
export const FAITH_HISTORY_MAX_CHARS = 4000;

/**
 * Info: (20260812 - Luphia) 費思個人化記憶於「付費訂閱終止後」保留天數的**預設值**。
 *
 * 正式值為系統設定，保存於 DB（`SystemSettingKey.FAITH_MEMORY_RETENTION_DAYS`，同 ADR 017
 * 的簽章式設定），可由後台調整、不需重啟；本常數僅在查無設定值或值不合法時作為 fail-safe。
 * 讀取一律經 `resolveFaithMemoryRetentionDays()`，嚴禁在別處直接引用本常數當生效值。
 *
 * ⚠️ 這個數字同時是**對外承諾**：服務條款 §3.7、《隱私權政策》§5 與方案頁文案均載明 90 天。
 * 後台調整設定時必須同步修訂該三處文字，否則條款所述期間與系統實際行為不符。
 *
 * ToDo: (20260812 - Luphia) 記憶儲存與到期刪除機制尚未實作（費思目前為無記憶 one-shot），
 * 須於 v0.13.0 釋出前完成。規範與驗收條件見
 * documents/architecture/ai_and_analytics/faith_personal_memory.md（§1 承諾對照表、§9 Release Gate）；
 * 其中 §5 記載一項必改點：記憶注入會抬高 input tokens，預扣估算須加計注入上界，
 * 否則 hold 不再是成本上界。未完成前不得對外宣稱此權益。
 */
export const DEFAULT_FAITH_MEMORY_RETENTION_DAYS = 90;

/**
 * Info: (20260812 - Luphia) 保留天數的合法區間（fail-safe 判斷用）。
 * 上界 3,650 天（10 年）不是法規數字，而是「打錯一個零」的防線：
 * 設定值若被誤填成 90000，記憶就等於永不刪除，而那是條款明文承諾要刪的。
 */
export const FAITH_MEMORY_RETENTION_DAYS_MIN = 1;
export const FAITH_MEMORY_RETENTION_DAYS_MAX = 3650;
