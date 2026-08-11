/**
 * Info: (20260811 - Emily) markdown 表格的欄數修補
 * (data/issue_drafts/open/19 第 3 張票的實際根因)。
 *
 * GFM 的規則是「資料列超出表頭的欄一律丟棄」。原文照錄的表格常常踩到它 ——
 * 原始報告用的是兩層表頭(父標題橫跨數欄,子標題在下一列),
 * 而 markdown 沒有 colspan,模型只好把父標題那一列寫成較少的欄。
 * 於是表頭宣告 4 欄、資料列有 10 欄,後面 6 欄**連同內容一起消失**,
 * 而且沒有任何錯誤 —— 渲染出來是一張看起來很正常、少了六欄的表。
 *
 * 實測 UAT 那份報告(1,807 行、26 張表):4 張表的表頭比資料列窄,
 * 合計 **261 個非空儲存格**被靜默丟掉,包括表3.1 七種溫室氣體裡的五種。
 * 那是一份要送第三方查證的文件。
 *
 * 這裡只做一件事:把表頭(與其分隔列)補到「最寬那一列」的欄數。
 * 不動任何一格既有內容,只在表頭尾端加空欄 —— 子標題列因此落在正確的位置。
 *
 * **只在真的會掉資料時才補。** 有些表的資料列多出來的那一格是空的
 * (行尾多打一個 `|`),補欄只會憑空多一條空欄;那種情況維持原樣。
 */

const ROW = /^\s*\|.*\|\s*$/;
const DIVIDER = /^\s*\|[\s:|-]+\|\s*$/;

/** Info: (20260811 - Emily) 逐格切開;`\|` 是逃脫的直線,不是欄位邊界 */
const splitCells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/);

export interface IMarkdownTableColumnFix {
  /** Info: (20260811 - Emily) 修補後的 markdown;不需修補時與輸入相同 */
  markdown: string;
  /** Info: (20260811 - Emily) 表頭原本的欄數 */
  headerColumns: number;
  /** Info: (20260811 - Emily) 最寬那一列的欄數 */
  widestColumns: number;
  /** Info: (20260811 - Emily) 補欄後不再被 GFM 丟掉的非空儲存格數 */
  recoveredCells: number;
}

/**
 * Info: (20260811 - Emily) 把表頭補到最寬那一列的欄數。
 * 找不到「表頭列 + 分隔列」的組合(不是表格)即原樣返回。
 */
export const padTableHeaderToWidest = (
  markdown: string,
): IMarkdownTableColumnFix => {
  const lines = markdown.split("\n");
  const headerIndex = lines.findIndex(
    (line, index) =>
      ROW.test(line) &&
      !DIVIDER.test(line) &&
      index + 1 < lines.length &&
      DIVIDER.test(lines[index + 1]),
  );
  if (headerIndex === -1) {
    return {
      markdown,
      headerColumns: 0,
      widestColumns: 0,
      recoveredCells: 0,
    };
  }

  const headerColumns = splitCells(lines[headerIndex]).length;
  const bodyRows = lines
    .slice(headerIndex + 2)
    .filter((line) => ROW.test(line) && !DIVIDER.test(line))
    .map(splitCells);
  const widestColumns = bodyRows.reduce(
    (widest, cells) => Math.max(widest, cells.length),
    headerColumns,
  );
  const recoveredCells = bodyRows
    .flatMap((cells) => cells.slice(headerColumns))
    .filter((cell) => cell.trim() !== "").length;

  if (widestColumns <= headerColumns || recoveredCells === 0) {
    return { markdown, headerColumns, widestColumns, recoveredCells };
  }

  const missing = widestColumns - headerColumns;
  const pad = (line: string, filler: string): string =>
    `${line.trimEnd()}${` ${filler} |`.repeat(missing)}`;

  const patched = lines.map((line, index) => {
    if (index === headerIndex) return pad(line, "");
    if (index === headerIndex + 1) return pad(line, "---");
    return line;
  });

  return {
    markdown: patched.join("\n"),
    headerColumns,
    widestColumns,
    recoveredCells,
  };
};
