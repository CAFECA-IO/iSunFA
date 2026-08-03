// Info: (20260801 - Tzuhan) 原文表格(source table)常數:自上傳文件逐字照錄的表格
// Info: (20260801 - Tzuhan) 見 issue_drafts/inventory_table_import/00_plan.md 的 Issue A。
//
// Info: (20260801 - Tzuhan) 為什麼需要一個獨立的命名空間:
// Info: (20260801 - Tzuhan) 數據段落原本有兩道刻意的封鎖 —— stripLlmTables 丟棄草稿夾帶的任何表格、
// Info: (20260801 - Tzuhan) 提示詞明寫「數據段落不得自產統計表格」。那不是 bug,是 zero fabrication 的執行面:
// Info: (20260801 - Tzuhan) 它假設「表格 = LLM 產生 = 不可信」。要匯入原文表格,就必須讓系統分辨
// Info: (20260801 - Tzuhan) 「照抄」與「產生」——照抄的帶本命名空間的錨點,不受剝除;產生的仍走 carbon-data-table。
// Info: (20260801 - Tzuhan) 兩者並存但絕不合併:一個是外部文件的事實,一個是本系統的計算結果。

/**
 * Info: (20260801 - Tzuhan) 原文表格錨點前綴。與 `carbon-data-table`(系統計算)、
 * `carbon-chart`(數據圖表)、`carbon-diagram`(結構圖)並列,四者命名空間互不重疊,
 * 重算任一種都不會誤傷其他三種。
 */
export const CARBON_SOURCE_TABLE_ANCHOR_PREFIX = "carbon-source-table";

/**
 * Info: (20260801 - Tzuhan) 錨點以表號為鍵(如 `表3.8`):同一節可能收錄多張原文表格
 * (3.6 就會同時有表3.6 所在地基準與表3.7 市場基準),必須逐張定位才能各自替換。
 */
export const buildSourceTableAnchorStart = (tableNo: string): string =>
  `<!-- ${CARBON_SOURCE_TABLE_ANCHOR_PREFIX}:${tableNo}:start -->`;

export const buildSourceTableAnchorEnd = (tableNo: string): string =>
  `<!-- ${CARBON_SOURCE_TABLE_ANCHOR_PREFIX}:${tableNo}:end -->`;

/**
 * Info: (20260801 - Tzuhan) 比對任一原文表格錨點(不限表號)。
 * 用於剝除判定:只要落在任一組錨點之間就是照錄內容,不可丟棄。
 */
export const SOURCE_TABLE_ANCHOR_PATTERN = new RegExp(
  `<!--\\s*${CARBON_SOURCE_TABLE_ANCHOR_PREFIX}:(.+?):(start|end)\\s*-->`,
);

/**
 * Info: (20260801 - Tzuhan) 單一段落可收錄的原文表格數上限。
 * 3.6 節最多會有表3.5~3.8 四張;取 6 留有餘裕,同時避免模型把整章表格全塞進一節。
 */
export const CARBON_SOURCE_TABLE_MAX_PER_PARAGRAPH = 6;

/**
 * Info: (20260801 - Tzuhan) 表號格式:`表` + 章.節(如 表3.8)。
 * 以此驗證而非任意字串,理由是表號會成為錨點的一部分,
 * 任意字串進得來就等於讓模型自訂錨點語法(可用以偽造系統表格的錨點)。
 */
export const SOURCE_TABLE_NO_PATTERN = /^表[0-9]+\.[0-9]+$/;
