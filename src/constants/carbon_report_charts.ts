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
}

// Info: (20260720 - Tzuhan) 桑基圖憑證節點上限:超過即略過憑證層(排放源→Scope),避免不可讀的毛線團
export const CARBON_SANKEY_MAX_EVIDENCE_NODES = 30;

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
