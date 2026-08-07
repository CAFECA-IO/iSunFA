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
