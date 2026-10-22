export const BUSINESS_MONITOR_INDUSTRIES = {
  SEMICONDUCTOR: "SEMICONDUCTOR",
  COMPUTER_PERIPHERALS: "COMPUTER_PERIPHERALS",
  OPTOELECTRONICS: "OPTOELECTRONICS",
  COMMUNICATIONS: "COMMUNICATIONS",
  ELECTRONIC_COMPONENTS: "ELECTRONIC_COMPONENTS",
} as const;

/**
 * Info: (20261015 - Luphia) 產業篩選的鍵 → 報告上的產業名稱（證交所產業別名稱）。
 *
 * 篩選選單送出的是 `SEMICONDUCTOR` 這類鍵，而 `Report.industry` 存的是「半導體業」這類名稱，
 * 原本直接拿鍵去比對名稱，產業篩選因此永遠查不到東西。
 */
export const BUSINESS_MONITOR_INDUSTRY_NAME: Record<
  keyof typeof BUSINESS_MONITOR_INDUSTRIES,
  string
> = {
  SEMICONDUCTOR: "半導體業",
  COMPUTER_PERIPHERALS: "電腦及週邊設備業",
  OPTOELECTRONICS: "光電業",
  COMMUNICATIONS: "通信網路業",
  ELECTRONIC_COMPONENTS: "電子零組件業",
};

/**
 * Info: (20261015 - Luphia) 報告上的資本額級距（沿用既有手動匯入報告的寫法）。
 * 企業觀測站以 `Company` 的實收資本額決定級距；門檻見 `BUSINESS_MONITOR_CAPITAL_THRESHOLD`。
 */
export const BUSINESS_MONITOR_CAPITAL_RANGE = {
  UNDER_1B: "10億以下",
  FROM_1B_TO_5B: "10億~50億",
  FROM_5B_TO_10B: "50億~100億",
  OVER_10B: "100億以上",
} as const;

// Info: (20261015 - Luphia) 級距門檻（新台幣元）；以 BigInt 比較，不經過浮點數
export const BUSINESS_MONITOR_CAPITAL_THRESHOLD = {
  ONE_BILLION: BigInt("1000000000"),
  FIVE_BILLION: BigInt("5000000000"),
  TEN_BILLION: BigInt("10000000000"),
} as const;

// Info: (20261022 - Luphia) AI 諮詢：單則問題長度上限（字元）；超過就是貼文件而不是問問題
export const BUSINESS_MONITOR_QUESTION_MAX_LENGTH = 500;

// Info: (20261022 - Luphia) 引用編號格式：回答中以 [1]、[2] 標示出處，伺服端據此比對證據清單
export const BUSINESS_MONITOR_CITATION_MARKER = /\[(\d{1,2})\]/g;

// Info: (20261022 - Luphia) 單一證據片段送進提示詞的字元上限，避免一段長表格吃光整個上下文
export const BUSINESS_MONITOR_EVIDENCE_MAX_CHARS = 1200;

// Info: (20261022 - Luphia) 原始檔下載的內容類型（舊報告一律是 PDF；觀測站的結構化來源是純文字）
export const BUSINESS_MONITOR_FILE_CONTENT_TYPE = {
  PDF: "application/pdf",
  TEXT: "text/plain; charset=utf-8",
} as const;

export type BusinessMonitorFileContentType =
  (typeof BUSINESS_MONITOR_FILE_CONTENT_TYPE)[keyof typeof BUSINESS_MONITOR_FILE_CONTENT_TYPE];

/**
 * Info: (20261022 - Luphia) 公司頁報告庫的文件狀態（給使用者看的四種，由觀測站內部狀態收斂而來）：
 * 可下載、排程中、來源尚未公布、取得失敗。
 */
export const BUSINESS_MONITOR_DOCUMENT_STATUS = {
  AVAILABLE: "AVAILABLE",
  PENDING: "PENDING",
  NOT_PUBLISHED: "NOT_PUBLISHED",
  FAILED: "FAILED",
} as const;

export type BusinessMonitorDocumentStatus =
  (typeof BUSINESS_MONITOR_DOCUMENT_STATUS)[keyof typeof BUSINESS_MONITOR_DOCUMENT_STATUS];

// Info: (20261022 - Luphia) 首頁搜尋框的公司建議筆數與產業瀏覽每頁筆數
export const BUSINESS_MONITOR_SUGGESTION_LIMIT = 8;
export const BUSINESS_MONITOR_COMPANY_PAGE_SIZE = 20;
export const BUSINESS_MONITOR_COMPANY_MAX_PAGE_SIZE = 50;
export const BUSINESS_MONITOR_SEARCH_MAX_LENGTH = 50;

// Info: (20261022 - Luphia) 統一編號是 8 碼數字；搜尋框輸入整串統編時改以精確比對
export const BUSINESS_MONITOR_TAX_ID_PATTERN = /^\d{8}$/;

// Info: (20261022 - Luphia) 股票代號：上市櫃普通股 4 碼，特別股／ETF 可到 6 碼並含英文字母
export const BUSINESS_MONITOR_STOCK_ID_PATTERN = /^[0-9A-Z]{4,6}$/;

/**
 * Info: (20261022 - Luphia) AI 諮詢的年度範疇：從問題裡抓西元年。前端（送出前顯示範疇標籤）
 * 與後端（未帶範疇時自行偵測）用同一條規則，使用者看到的範疇就是實際查的範疇。
 */
// Info: (20261022 - Luphia) 前後不能緊接數字：「營收 120245 元」裡的 2024 不是年份
export const BUSINESS_MONITOR_YEAR_PATTERN = /(?<!\d)(?:19|20)\d{2}(?!\d)/g;
export const BUSINESS_MONITOR_MAX_SCOPE_YEARS = 5;

// Info: (20261022 - Luphia) 「台／臺」異體字：證交所簡稱多寫「台」，商業司登記名多寫「臺」，搜尋時兩種都查
export const BUSINESS_MONITOR_TAI_VARIANTS = ["台", "臺"] as const;

// Info: (20261022 - Luphia) 報告庫裡手動匯入的舊報告：不屬於觀測站任何來源，以此代碼標示
export const BUSINESS_MONITOR_MANUAL_IMPORT_SOURCE = "MANUAL_IMPORT";
