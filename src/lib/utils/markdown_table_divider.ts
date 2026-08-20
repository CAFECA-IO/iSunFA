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

/**
 * Info: (20260820 - Emily) 一列有幾個儲存格。**匯出**給 `validateSourceTables` 共用 ——
 * 「一列有幾格」是同一個判定，不該有第二份實作（PR review B1 的同一條規則）。
 *
 * `\|` 是逃脫的直線不是欄位邊界，所以用否定回顧。
 */
export const countTableCells = (line: string): number =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/).length;

/**
 * Info: (20260820 - Emily) 把「超寬列」裁到分隔列的欄數 —— 只裁空白，不裁內容。
 *
 * ## 為什麼需要
 *
 * 08-20 run C：`表3.4` 的第一列是 **547 格、其中只有 5 格有字**
 * （`| 排放類型 | 活動或設施 | 排放源 | 年活動數據資訊 |` 後面接 541 個空格與一個 `-`），
 * 而分隔列與其後 14 列資料全部是 6 格。GFM 要求表頭與分隔列欄數相同，
 * 於是整張表不渲染 —— 08-19 那趟就是這樣在紙上印出 1,273 個管線的。
 *
 * 08-20 的渲染不變式把它改成明示丟表，紙上乾淨了，但**表也沒了**，
 * 而內文還引用著它（`內文引用的表不存在 缺 表3.4`）。丟表是比印亂碼好的失敗，
 * 但它仍然是失敗。
 *
 * ## 為什麼裁得掉而且不算猜
 *
 * 超出分隔列欄數的那些格**全部是空白或只有連字號** —— 空格不帶資訊，
 * 裁掉它不會丟掉任何一個排放量數字。這與 `padTableHeaderToWidest`（補窄的表頭）
 * 是同一件事的兩個方向：讓表頭與分隔列對齊，而不是去猜哪一列才是表頭。
 *
 * ⚠ 一旦超出的部分**有任何實質內容就不裁**，交回原樣讓
 * `validateSourceTables` 丟掉它。理由與不猜表頭相同：裁掉有字的格
 * 會把一個氣體的排放量整欄移位，那比丟一張表嚴重得多。
 */
const BLANK_OR_DASHES = /^[\s-]*$/;

const splitTableCells = (line: string): string[] =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/);

export const trimRowsToDividerWidth = (
  markdown: string,
): { markdown: string; trimmed: number } => {
  const lines = markdown.split("\n");
  const dividerIndex = lines.findIndex(
    (line, index) =>
      index > 0 &&
      ROW.test(lines[index - 1].trim()) &&
      !DIVIDER.test(lines[index - 1].trim()) &&
      DIVIDER.test(line.trim()),
  );
  if (dividerIndex < 0) return { markdown, trimmed: 0 };

  const width = countTableCells(lines[dividerIndex].trim());
  let trimmed = 0;

  const next = lines.map((line, index) => {
    if (index === dividerIndex) return line;
    const body = line.trim();
    if (!ROW.test(body) || DIVIDER.test(body)) return line;

    const cells = splitTableCells(body);
    if (cells.length <= width) return line;
    if (!cells.slice(width).every((cell) => BLANK_OR_DASHES.test(cell))) {
      return line;
    }

    trimmed += 1;
    const indent = line.match(/^\s*/)?.[0] ?? "";
    return `${indent}|${cells.slice(0, width).join("|")}|`;
  });

  return { markdown: next.join("\n"), trimmed };
};

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
): { markdown: string; inserted: boolean; skipped?: string } => {
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
    const columns = countTableCells(lines[start].trim());
    if (columns < 2) continue;

    let end = start;
    while (
      isRowAt(end + 1) &&
      countTableCells(lines[end + 1].trim()) === columns
    ) {
      end += 1;
    }
    if (end - start + 1 < MIN_CONSISTENT_ROWS) continue;

    /**
     * Info: (20260819 - Emily) 一致列的**上面**還有表格列 —— 不補,交回原樣。
     *
     * GFM 只認「表格區塊的第二行」那條分隔列。一致列不是第一列時,補進去的分隔列
     * 落在區塊中間,而上面那一列仍然沒有分隔列 —— 整個區塊因此都不渲染,
     * markdown 原樣印在紙上。
     *
     * 08-19 run2 實測:`表3.4` 的表頭被模型壓成**一個約 600 格的邏輯列**
     * (原文是兩層合併表頭),而一致列是它下面的 6 欄資料列。補完之後紙上出現
     * 1,273 個管線與 19 條 `|---|---|`(`open/47` 第三種形狀)。
     *
     * 這裡的立場與補而不丟相反,理由是**後果不對等**:
     * 補錯位置 → 紙上一片管線,而且沒有任何 log 說它壞了(靜默且醜);
     * 不補 → `validateSourceTables` 會擋下來,`log_丟表` 與「引用但不存在的表」
     * 兩條判準都會叫。與 `open/48`「退化不消失、失敗留下痕跡」同一個原則:
     * 一個看得見的失敗勝過一個看起來像成品的壞東西。
     *
     * 不猜「哪一列才是真正的表頭」的理由見上方註解 —— 猜錯會把一個氣體的
     * 排放量標成別的名目,那比丟一張表嚴重。
     */
    if (start > 0 && isRowAt(start - 1)) {
      return {
        markdown,
        inserted: false,
        skipped: "rows_above_consistent_run",
      };
    }

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
