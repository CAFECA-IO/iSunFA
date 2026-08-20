// Info: (20260801 - Tzuhan) 原文表格區塊的產生與定位(純函數)
// Info: (20260801 - Tzuhan) 見 issue_drafts/inventory_table_import/00_plan.md 的 Issue A。
//
// Info: (20260801 - Tzuhan) 與 carbon_report_table.builder 的分工:
// Info: (20260801 - Tzuhan) 那邊的表格由 computedLedger 決定性產出,重算時會被刷新;
// Info: (20260801 - Tzuhan) 這邊的表格是上傳文件的逐字照錄,**不隨重算變動** —— 原文是既成的事實,
// Info: (20260801 - Tzuhan) 我們的引擎重算幾次都不該改動它。兩者並存,由錨點命名空間分隔。

import {
  buildSourceTableAnchorEnd,
  buildSourceTableAnchorStart,
  CARBON_SOURCE_TABLE_MAX_PER_PARAGRAPH,
  SOURCE_TABLE_NO_PATTERN,
} from "@/constants/carbon_source_tables";
import { countTableCells } from "@/lib/utils/markdown_table_divider";

export interface ICarbonSourceTable {
  /** Info: (20260801 - Tzuhan) 原文的表號(如 表3.8),同時是錨點鍵與圖說前綴 */
  tableNo: string;
  /** Info: (20260801 - Tzuhan) 原文的表格標題,照抄不改寫 */
  caption: string;
  /** Info: (20260801 - Tzuhan) 來源頁碼(1-based);跨頁表格給起訖兩頁 */
  sourcePages: number[];
  /** Info: (20260801 - Tzuhan) 逐字照錄的 markdown 表格 */
  markdown: string;
}

export enum SourceTableRejectReasonEnum {
  INVALID_TABLE_NO = "invalid_table_no",
  EMPTY_MARKDOWN = "empty_markdown",
  NOT_A_TABLE = "not_a_table",
  /**
   * Info: (20260820 - Emily) 有「表頭列 + 緊接的分隔列」，但兩者**欄數不同**。
   * GFM 要求分隔列的儲存格數等於表頭列 —— 不等就整個區塊都不渲染。
   * 與 `NOT_A_TABLE` 分開是因為它們是不同的問題：
   * 前者是「模型沒寫分隔列」，後者是「寫了但對不上」，修法不同。
   */
  DIVIDER_COLUMN_MISMATCH = "divider_column_mismatch",
  TOO_MANY_TABLES = "too_many_tables",
}

export interface ISourceTableValidation {
  isValid: boolean;
  reason?: SourceTableRejectReasonEnum;
  offendingTableNo?: string;
}

/**
 * Info: (20260801 - Tzuhan) markdown 是否真的是一張表格:至少要有表頭列與分隔列。
 * 只檢查形狀不檢查內容 —— 內容的正確性由「逐字照抄」保證,不是我們能驗的。
 *
 * Info: (20260804 - Tzuhan) 原本要求分隔列**剛好是第二個非空行**:
 *
 * ```ts
 * return isRow(lines[0]) && isDivider(lines[1]);
 * ```
 *
 * 那等於假設模型照錄表格時,第一行一定就是表頭列。實測不成立 ——
 * 表3.8 與表3.4 都被判 not_a_table 而整張丟掉,而表3.8 是桑基圖唯一的資料來源,
 * 於是圖整張消失。前面幾行可能是原文的表格標題、廠址標籤或空白,
 * 那些不會讓它不是一張表。
 *
 * 改為:內容中存在**任一組「表頭列 + 緊接的分隔列」**即認定為表格。
 * 這仍然擋得住模型自由書寫的散文(分隔列的形狀很特定,散文不會湊巧產生),
 * 但不再因為開頭多一行標題就把整張表丟掉。
 * 兩種錯的代價差很多:誤收一段散文會被逐字照錄的原則與表號驗證擋下,
 * 誤丟一張表卻是無聲的 —— 報告裡就是少一張,沒有人會知道。
 */
type TableShape = "table" | "no_divider" | "column_mismatch";

/**
 * Info: (20260820 - Emily) 08-20 補上**欄數一致**這個條件，理由是實跑量到的失效。
 *
 * 原本只要求「存在任一組表頭列 + 緊接的分隔列」。實測 08-19 run2 與 08-20 run A
 * 各有一張表通過了這個檢查，卻在紙上印成 1,129~1,273 個管線與 6~19 條 `|---`：
 * 模型把兩層合併表頭壓成**一個約 600 格的邏輯列**，而分隔列只有 6 欄。
 *
 * GFM 要求分隔列的儲存格數等於表頭列，不等就整個區塊都不渲染。
 * 所以「有分隔列」不是充分條件，「欄數也對得上」才是。
 *
 * ## 為什麼不回到「分隔列必須是第二個非空行」
 *
 * 那是 08-01 的原始規則，08-04 因為實測而放寬 —— 表3.8 與表3.4 都被判
 * `not_a_table` 整張丟掉（表3.8 是桑基圖唯一的資料來源，於是圖整張消失），
 * 因為前面幾行可能是原文的表格標題、廠址標籤或空白。那個放寬是對的，這裡不動它。
 *
 * 新條件只補一件事：**那一組配對的欄數要相同。** 前面有幾行標題仍然無所謂。
 *
 * ## 為什麼要分辨三種結果
 *
 * 「沒有分隔列」與「有但對不上」的修法不同（前者補、後者是模型輸出壞了），
 * 而日誌只寫 `not_a_table` 的話兩者分不開 —— 08-04 的註解已經記過一次
 * 「知道被擋了，但永遠不知道為什麼」的代價。
 */
const inspectMarkdownTable = (markdown: string): TableShape => {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return "no_divider";
  const isRow = (line: string): boolean => /^\|.*\|$/.test(line);
  // Info: (20260801 - Tzuhan) 分隔列:| --- | :--: | 之類,只由 -、:、|、空白組成
  const isDivider = (line: string): boolean =>
    isRow(line) && /^\|[\s:|-]+\|$/.test(line);

  const pairs = lines
    .map((line, index) => ({ line, next: lines[index + 1] }))
    .filter(
      (pair) =>
        pair.next !== undefined &&
        isRow(pair.line) &&
        !isDivider(pair.line) &&
        isDivider(pair.next),
    );
  if (pairs.length === 0) return "no_divider";

  return pairs.some(
    (pair) =>
      countTableCells(pair.line) === countTableCells(pair.next as string),
  )
    ? "table"
    : "column_mismatch";
};

/**
 * Info: (20260801 - Tzuhan) 驗證整批原文表格。任一張不合格即整批拒絕:
 * 部分收錄會讓報告出現「有些表格照錄了、有些沒有」而讀者無從得知缺了什麼,
 * 與逐段圖那邊的立場一致 —— 缺漏必須是明示的,不能是沉默的。
 */
export function validateSourceTables(
  tables: ICarbonSourceTable[],
): ISourceTableValidation {
  if (tables.length > CARBON_SOURCE_TABLE_MAX_PER_PARAGRAPH) {
    return {
      isValid: false,
      reason: SourceTableRejectReasonEnum.TOO_MANY_TABLES,
    };
  }
  for (const table of tables) {
    if (!SOURCE_TABLE_NO_PATTERN.test(table.tableNo)) {
      return {
        isValid: false,
        reason: SourceTableRejectReasonEnum.INVALID_TABLE_NO,
        offendingTableNo: table.tableNo,
      };
    }
    if (table.markdown.trim().length === 0) {
      return {
        isValid: false,
        reason: SourceTableRejectReasonEnum.EMPTY_MARKDOWN,
        offendingTableNo: table.tableNo,
      };
    }
    const shape = inspectMarkdownTable(table.markdown);
    if (shape !== "table") {
      return {
        isValid: false,
        reason:
          shape === "column_mismatch"
            ? SourceTableRejectReasonEnum.DIVIDER_COLUMN_MISMATCH
            : SourceTableRejectReasonEnum.NOT_A_TABLE,
        offendingTableNo: table.tableNo,
      };
    }
  }
  return { isValid: true };
}

export interface ICarbonSourceTableLabels {
  /** Info: (20260801 - Tzuhan) 圖說前綴,明示這是照錄而非本系統計算 */
  verbatimPrefix: string;
  /** Info: (20260801 - Tzuhan) 頁碼標示 */
  pageLabel: string;
}

export const CARBON_SOURCE_TABLE_DEFAULT_LABELS: ICarbonSourceTableLabels = {
  verbatimPrefix: "原文照錄",
  pageLabel: "p.",
};

/**
 * Info: (20260801 - Tzuhan) 組出單張原文表格的區塊(含錨點與來源標示)。
 *
 * 標題一律帶「原文照錄」與頁碼:讀者必須能一眼分辨這張表不是本系統算的,
 * 而且要能翻回原文件的那一頁對照。少了這兩件事,照錄的表格反而比不放更危險 ——
 * 它會被誤認為系統的計算結果。
 */
export function buildSourceTableBlock(
  table: ICarbonSourceTable,
  labels: ICarbonSourceTableLabels = CARBON_SOURCE_TABLE_DEFAULT_LABELS,
): string {
  const pages =
    table.sourcePages.length > 0
      ? ` ${labels.pageLabel}${table.sourcePages.join("–")}`
      : "";
  return [
    buildSourceTableAnchorStart(table.tableNo),
    `**${table.tableNo} ${table.caption}**（${labels.verbatimPrefix}${pages}）`,
    "",
    table.markdown.trim(),
    buildSourceTableAnchorEnd(table.tableNo),
  ].join("\n");
}

/**
 * Info: (20260801 - Tzuhan) 段落內是否已有該表號的原文表格
 */
export function hasSourceTableBlock(content: string, tableNo: string): boolean {
  return content.includes(buildSourceTableAnchorStart(tableNo));
}

/**
 * Info: (20260801 - Tzuhan) 插入或原地替換單張原文表格。
 * 已存在同表號 → 只換那一塊(敘述與其他表格零改動);不存在 → 附加於尾端。
 */
export function insertSourceTableBlock(
  content: string,
  table: ICarbonSourceTable,
  labels: ICarbonSourceTableLabels = CARBON_SOURCE_TABLE_DEFAULT_LABELS,
): string {
  const block = buildSourceTableBlock(table, labels);
  const start = buildSourceTableAnchorStart(table.tableNo);
  const end = buildSourceTableAnchorEnd(table.tableNo);
  const startIndex = content.indexOf(start);
  if (startIndex === -1) {
    return `${content.trimEnd()}\n\n${block}`;
  }
  const endIndex = content.indexOf(end, startIndex);
  if (endIndex === -1) {
    // Info: (20260801 - Tzuhan) 只有起錨點沒有結束錨點:內容被截斷過,附加新塊而不吞掉既有文字
    return `${content.trimEnd()}\n\n${block}`;
  }
  return (
    content.slice(0, startIndex) + block + content.slice(endIndex + end.length)
  );
}
