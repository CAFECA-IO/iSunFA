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
 * Info: (20260801 - Tzuhan) 表號的**正規形式**:`表` + 以點分隔的層級(如 表3.8、表3.6.1)。
 * 以此驗證而非任意字串,理由是表號會成為錨點的一部分,
 * 任意字串進得來就等於讓模型自訂錨點語法(可用以偽造系統表格的錨點)。
 */
export const SOURCE_TABLE_NO_PATTERN = /^表[0-9]+(\.[0-9]+){1,2}$/;

/**
 * Info: (20260802 - Tzuhan) 表號正規化。
 *
 * 實測(高興昌報告)每一張表都被擋在 `tableNo: custom`,原因是原文的表號寫法與
 * 我假設的單一形式不符:「表 3.6」有全形空格、「表3-6」用連字號、
 * 部分章節用到三層(表3.6.1)。這些都是**同一個語意的不同寫法**,
 * 逐一拒絕等於因為格式差異丟掉真實資料 —— 該做的是收斂寫法,不是拒收。
 *
 * 正規化只處理「寫法」,不改變「內容」:去空白、全形轉半形、分隔符統一為點。
 * 正規化後仍不符 SOURCE_TABLE_NO_PATTERN 者才拒絕,錨點安全性因此不變。
 */
export const normalizeSourceTableNo = (raw: string): string =>
  raw
    .trim()
    // Info: (20260802 - Tzuhan) 全形數字與全形句點轉半形(原文常見全形排版)
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/[．。]/g, ".")
    // Info: (20260802 - Tzuhan) 半形/全形空白、連字號、頓號一律視為層級分隔或贅字
    .replace(/[\s　]+/g, "")
    .replace(/[-–—－]/g, ".")
    // Info: (20260802 - Tzuhan) 收尾的點(如「表3.6.」)去掉
    .replace(/\.+$/, "");

/**
 * Info: (20260802 - Tzuhan) 頁碼陣列的長度上限。
 * 原假設「跨頁表格給起訖兩頁」是錯的:模型會把實際跨越的每一頁都列出來
 * (表3.8 跨 41~43 頁就給三個數字),實測因此被 `sourcePages: too_big` 擋掉。
 * 收下之後由 normalizeSourcePages 收斂為起訖兩頁 —— 那才是顯示需要的形式。
 */
export const SOURCE_TABLE_MAX_PAGE_ENTRIES = 12;

/**
 * Info: (20260802 - Tzuhan) 頁碼收斂為 [起, 訖]。單頁只留一個值。
 * 取 min/max 而非首尾:模型偶爾會亂序,而「這張表在第幾頁到第幾頁」與順序無關。
 */
export const normalizeSourcePages = (pages: number[]): number[] => {
  const valid = pages.filter((page) => Number.isInteger(page) && page >= 1);
  if (valid.length === 0) return [];
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  return min === max ? [min] : [min, max];
};
