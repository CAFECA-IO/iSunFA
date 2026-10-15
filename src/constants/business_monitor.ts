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
