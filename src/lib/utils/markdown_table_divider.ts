/**
 * Info: (20260814 - Emily) 沒有分隔列的原文表格，補一條而不是整張丟掉
 * (`data/issue_drafts/open/27_source_table_missing_divider.md`)。
 *
 * ## 為什麼需要
 *
 * 2026-08-14 匯入實測，四張原文表格被 `not_a_table` 整張丟掉，
 * 而 `表3.1` 與 `表3.4` **被內文引用** —— 產出的報告裡留著
 * 「如表 3.1，依據類別一…」指向一張不存在的表。
 *
 * 關鍵是那些表**內容是好的**：
 *
 *     | 設施/活動 | 溫室氣體源 | 可能產生溫室氣體種類 | | | | | | | 備註 |
 *     | | | CO2 | CH4 | N2O | HFCs | PFCs | NF3 | SF6 | （類別） |
 *     | 緊急發電機 | 柴油 | V | V | V | | | | | 類別一 |
 *
 * 十欄、子標題對位 —— 匯入 prompt 的兩層表頭要求生效了。
 * 缺的只有一條 `| --- |`，而模型不寫它其實合理：兩層表頭的分隔列該放在哪一列之後，
 * GFM 本身就沒有答案。
 *
 * ## 補而不丟
 *
 * 與 `padTableHeaderToWidest` 同一個形狀。`carbon_source_table.builder` 自己的註解
 * 已經寫過這個立場：「誤收一段散文會被逐字照錄的原則與表號驗證擋下，
 * **誤丟一張表卻是無聲的**」。
 *
 * ## 把散文擋在外面的判準是「欄數一致」
 *
 * 分隔列的形狀很特定，散文不會湊巧產生 —— 那是原本的判準。
 * 拿掉它之後需要一個替代品：**連續多列、每列欄數相同**。
 * 散文不會湊巧出現三行都被直線切成同樣格數的段落，而表格必然如此。
 */

const ROW = /^\|.*\|$/;
const DIVIDER = /^\|[\s:|-]+\|$/;

/**
 * Info: (20260814 - Emily) 要幾列一致才算表格。
 *
 * 三列 = 表頭 + 至少兩列資料。兩列太鬆（兩行剛好被直線切成同樣格數並非不可能），
 * 四列太緊（原文有些小表就是三列）。
 */
const MIN_CONSISTENT_ROWS = 3;

const cellCount = (line: string): number =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/).length;

/**
 * Info: (20260814 - Emily) 補一條分隔列。已經有的話原樣返回（冪等）。
 *
 * ## 分隔列固定插在第一列之後
 *
 * 對表3.1 是對的（第一列就是父標題）。對表3.4 不理想 ——
 * 它的第一列是廠址標籤 `| (1) 總公司 | | | | | |`，會變成表頭。
 *
 * 但**內容一格都不會少**，而那才是重點。要判斷「哪一列才是真正的表頭」就是猜，
 * 而猜錯的後果與補欄那張票一樣：把一個氣體的排放量標成別的名目。
 * 寧可讓一列標籤當表頭（看得出來要對照原文），也不要生出看起來合理的錯誤結構。
 */
export const ensureTableDivider = (
  markdown: string,
): { markdown: string; inserted: boolean } => {
  const lines = markdown.split("\n");
  const isRowAt = (index: number): boolean =>
    index < lines.length && ROW.test(lines[index].trim());

  // Info: (20260814 - Emily) 已經有「表頭列 + 緊接分隔列」就什麼都不做
  const hasDivider = lines.some(
    (line, index) =>
      isRowAt(index) &&
      !DIVIDER.test(line.trim()) &&
      isRowAt(index + 1) &&
      DIVIDER.test(lines[index + 1].trim()),
  );
  if (hasDivider) return { markdown, inserted: false };

  // Info: (20260814 - Emily) 找第一段「連續且欄數一致」的列
  for (let start = 0; start < lines.length; start += 1) {
    if (!isRowAt(start)) continue;
    const columns = cellCount(lines[start].trim());
    if (columns < 2) continue;

    let end = start;
    while (isRowAt(end + 1) && cellCount(lines[end + 1].trim()) === columns) {
      end += 1;
    }
    if (end - start + 1 < MIN_CONSISTENT_ROWS) continue;

    const indent = lines[start].match(/^\s*/)?.[0] ?? "";
    const divider = `${indent}|${" --- |".repeat(columns)}`;
    return {
      markdown: [
        ...lines.slice(0, start + 1),
        divider,
        ...lines.slice(start + 1),
      ].join("\n"),
      inserted: true,
    };
  }

  // Info: (20260814 - Emily) 找不到一致的列 —— 那就真的不是表格，交回原樣讓驗證器擋
  return { markdown, inserted: false };
};
