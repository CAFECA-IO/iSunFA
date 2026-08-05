// Info: (20260720 - Tzuhan) 報告圖表模板白名單(#51):可用圖型 × 資料切面的決定性列舉
// Info: (20260720 - Tzuhan) LLM 只裁決「使用者要哪張圖、放哪段」(雙 enum 鎖死);
// Info: (20260720 - Tzuhan) 圖表數值一律由模板函式從 computedLedger 產出,LLM 零參與填值
// Info: (20260720 - Tzuhan) 註:TREND_LINE(期間趨勢)因單期 ledger 無時間序列刻意不上架 —
// Info: (20260720 - Tzuhan) 永不可滿足的模板即地雷;待多期資料模型(後續 issue)一併實作
export enum CarbonChartTemplateEnum {
  // Info: (20260720 - Tzuhan) 各範疇占比圓餅圖(mermaid pie)
  SCOPE_PIE = "SCOPE_PIE",
  // Info: (20260720 - Tzuhan) 各範疇長條圖(mermaid xychart-beta bar)
  SCOPE_BAR = "SCOPE_BAR",
  // Info: (20260720 - Tzuhan) 排放源明細表(markdown 表格,復用 #23 表格產生器)
  SOURCE_TABLE = "SOURCE_TABLE",
  // Info: (20260720 - Tzuhan) #53 碳流量桑基圖(mermaid sankey-beta):憑證 → 排放源 → Scope;
  // Info: (20260720 - Tzuhan) 總流入=總流出即質量守恆的視覺化(#22 同一哲學)
  EMISSION_SANKEY = "EMISSION_SANKEY",
  /**
   * Info: (20260803 - Tzuhan) 匯入報告的碳流量桑基圖:廠址 → 類別 → 排放形式(Issue C)。
   *
   * **刻意與 EMISSION_SANKEY 分開成兩個模板**,而不是在同一個模板裡分流:
   * 兩者的可信依據不同(一個是外部已查證的年度事實、一個是本系統可下鑽的帳本),
   * 共用錨點就只能存在一張,合併成一張則會讓查核者無法判斷任一條流量的來源。
   * 分開之後兩張圖可以並存,各自替換互不干擾。
   */
  IMPORTED_EMISSION_SANKEY = "IMPORTED_EMISSION_SANKEY",
}

// Info: (20260720 - Tzuhan) 桑基圖憑證節點上限:超過即略過憑證層(排放源→Scope),避免不可讀的毛線團
export const CARBON_SANKEY_MAX_EVIDENCE_NODES = 30;

/**
 * Info: (20260803 - Tzuhan) 匯入桑基圖的節點上限。超過即降為兩層(廠址 → 類別),
 * 寧可少一層也不畫成毛線團 —— 沿用憑證層的同一條哲學。
 * 實測這份報告:3 廠址 + 6 類別 + 16 子代碼 = 25 節點,在上限內。
 */
export const CARBON_SANKEY_MAX_IMPORTED_NODES = 40;

// Info: (20260721 - Tzuhan) UAT:排放總量匯總段(3.6)草稿生成時自動附掛碳流量桑基圖 —
// Info: (20260721 - Tzuhan) mermaid 原始碼落在 Markdown 輸入區,PDF 預覽區同步渲染
export const CARBON_AUTO_SANKEY_PARAGRAPH_ID = "ch3-6";

// Info: (20260720 - Tzuhan) 圖表區塊錨點(HTML 註解,渲染不可見):重算連動依此替換,敘述零改動
export const CARBON_CHART_ANCHOR_PREFIX = "carbon-chart";

export const buildChartAnchorStart = (
  templateId: CarbonChartTemplateEnum,
): string => `<!-- ${CARBON_CHART_ANCHOR_PREFIX}:${templateId}:start -->`;

export const buildChartAnchorEnd = (
  templateId: CarbonChartTemplateEnum,
): string => `<!-- ${CARBON_CHART_ANCHOR_PREFIX}:${templateId}:end -->`;
