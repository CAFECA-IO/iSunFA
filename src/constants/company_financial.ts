/**
 * Info: (20261023 - Luphia) 企業觀測站的財務數字（證交所／櫃買中心 OpenAPI）。
 *
 * 前後端共用，所以這個檔不 import 任何 Node 模組。
 * 來源事實（20261023 實測）：
 * - OpenAPI 只提供最新一期（2026-10-23 時為民國 115 年第 2 季），歷史要靠每日同步自行累積。
 * - 金額單位是仟元：台泥「股本 77,231,817」對上商業司登記「實收資本額 77,231,817,420 元」。
 * - 損益表是年初累計至該季：台積電第 2 季「營業收入 2,404,483,690」「基本每股盈餘 49.33」是兩季的量。
 * - 不同業別的報表格式（一般業、金融業、金控業、證券期貨業、保險業、異業）科目名稱不同，
 *   上櫃的欄位還混用英文鍵（SecuritiesCompanyCode、Year、Season）。
 */

export const FINANCIAL_STATEMENT = {
  INCOME: "INCOME",
  BALANCE: "BALANCE",
} as const;

export type FinancialStatement =
  (typeof FINANCIAL_STATEMENT)[keyof typeof FINANCIAL_STATEMENT];

// Info: (20261023 - Luphia) 單位原樣標示來源的單位，不換算
export const FINANCIAL_UNIT = {
  THOUSAND_NTD: "仟元",
  NTD: "元",
  SHARES: "股",
} as const;

export type FinancialUnit =
  (typeof FINANCIAL_UNIT)[keyof typeof FINANCIAL_UNIT];

// Info: (20261023 - Luphia) 證交所與櫃買中心的報表格式代碼（端點名稱的最後一段）
export const FINANCIAL_FORMS = [
  "ci",
  "basi",
  "bd",
  "fh",
  "ins",
  "mim",
] as const;

export type FinancialForm = (typeof FINANCIAL_FORMS)[number];

// Info: (20261023 - Luphia) 民國年轉西元年
export const ROC_YEAR_OFFSET = 1911;

/**
 * Info: (20261023 - Luphia) 列上的中繼欄位（不是科目）。上市用中文鍵，上櫃部分端點用英文鍵，
 * 同一支端點裡兩種都可能出現，依序找第一個有值的。
 */
export const FINANCIAL_META_KEYS = {
  STOCK_ID: ["公司代號", "SecuritiesCompanyCode"],
  YEAR: ["年度", "Year"],
  QUARTER: ["季別", "Season"],
  REPORTED_AT: ["出表日期", "Date"],
  COMPANY_NAME: ["公司名稱", "CompanyName"],
} as const;

/**
 * Info: (20261023 - Luphia) 公司頁顯示的關鍵科目：每一項列出各報表格式裡的候選名稱，依序取第一個有值的。
 * 畫面顯示的是來源原本的科目名稱（例：金控業的「淨收益」），不改成統一名稱，免得把不同定義說成同一件事。
 * 金融業（basi）沒有營業收入這一項，就不顯示，不拿「利息淨收益」頂替。
 */
export const FINANCIAL_KEY_ITEM = {
  REVENUE: "REVENUE",
  OPERATING_INCOME: "OPERATING_INCOME",
  NET_INCOME: "NET_INCOME",
  NET_INCOME_PARENT: "NET_INCOME_PARENT",
  EPS: "EPS",
  TOTAL_ASSETS: "TOTAL_ASSETS",
  TOTAL_LIABILITIES: "TOTAL_LIABILITIES",
  TOTAL_EQUITY: "TOTAL_EQUITY",
  BOOK_VALUE_PER_SHARE: "BOOK_VALUE_PER_SHARE",
} as const;

export type FinancialKeyItem =
  (typeof FINANCIAL_KEY_ITEM)[keyof typeof FINANCIAL_KEY_ITEM];

export const FINANCIAL_KEY_ITEM_SOURCES: Record<
  FinancialKeyItem,
  { statement: FinancialStatement; labels: readonly string[] }
> = {
  REVENUE: {
    statement: FINANCIAL_STATEMENT.INCOME,
    /**
     * Info: (20261023 - Luphia) 不收金控業的「淨收益」：20261023 實測證交所金控業端點欄位疑似錯位
     * （富邦金「淨收益」54 億小於「利息淨收益」1,121 億，「稅前損益」小於「稅後淨利」），
     * 不能當成營收；原值仍完整存在 CompanyFinancialFact。
     */
    labels: ["營業收入", "收益", "收入"],
  },
  OPERATING_INCOME: {
    statement: FINANCIAL_STATEMENT.INCOME,
    labels: ["營業利益（損失）", "營業利益"],
  },
  NET_INCOME: {
    statement: FINANCIAL_STATEMENT.INCOME,
    labels: ["本期淨利（淨損）", "本期稅後淨利（淨損）"],
  },
  NET_INCOME_PARENT: {
    statement: FINANCIAL_STATEMENT.INCOME,
    labels: ["淨利（淨損）歸屬於母公司業主", "淨利（損）歸屬於母公司業主"],
  },
  EPS: {
    statement: FINANCIAL_STATEMENT.INCOME,
    labels: ["基本每股盈餘（元）"],
  },
  TOTAL_ASSETS: {
    statement: FINANCIAL_STATEMENT.BALANCE,
    labels: ["資產總計", "資產總額"],
  },
  TOTAL_LIABILITIES: {
    statement: FINANCIAL_STATEMENT.BALANCE,
    labels: ["負債總計", "負債總額"],
  },
  TOTAL_EQUITY: {
    statement: FINANCIAL_STATEMENT.BALANCE,
    labels: ["權益總計", "權益總額"],
  },
  BOOK_VALUE_PER_SHARE: {
    statement: FINANCIAL_STATEMENT.BALANCE,
    labels: ["每股參考淨值"],
  },
};

// Info: (20261023 - Luphia) 由關鍵科目以 Decimal 算出的比率；公式寫在畫面上，讓人知道數字怎麼來的
export const FINANCIAL_RATIO = {
  DEBT_RATIO: "DEBT_RATIO",
  NET_MARGIN: "NET_MARGIN",
} as const;

export type FinancialRatio =
  (typeof FINANCIAL_RATIO)[keyof typeof FINANCIAL_RATIO];

// Info: (20261023 - Luphia) 比率顯示到小數第 2 位（百分比）
export const FINANCIAL_RATIO_DECIMALS = 2;

// Info: (20261023 - Luphia) 公司頁最多顯示幾期（新的在前）
export const FINANCIAL_PERIODS_SHOWN = 8;

// Info: (20261023 - Luphia) 淨利率只在營收科目是「營業收入」時計算：其他格式的「收益／收入」定義不同，算出來不能比
export const FINANCIAL_NET_MARGIN_REVENUE_LABEL = "營業收入";
