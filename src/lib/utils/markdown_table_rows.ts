/**
 * Info: (20260814 - Emily) 儲存格內含換行時把一列接回一行，而不是整張表丟掉
 * (`data/issue_drafts/open/28_source_table_cell_newline.md`)。
 *
 * ## 為什麼需要
 *
 * 原文那幾張表的表頭是窄欄多行排版，模型照錄時把**一格的內容折成多行**輸出：
 *
 *     | 等級 | 活動數據之
 *     不確定性 | CO2 之排放係數
 *     不確定性 | 定性/定量 |
 *
 * 那是一列，卻佔了三行。每一行都不是完整的 `| ... |`，於是
 * `looksLikeMarkdownTable` 的 `isRow` 與 `isDivider` 都不成立 —— **整張表被丟掉**。
 *
 * 2026-08-14 的匯入實測，表4.4、表4.5、表4.8 就是這樣消失的，
 * 其中表4.8 的 `lineCount` 是 1017 —— 一千多行被當成「不是表格」整段丟掉，
 * 目前單筆代價最大的靜默丟失。
 *
 * `27` 的 `ensureTableDivider` 救不了這種：同一列被切開之後，
 * 每一行的 `|` 數量都不一樣，「連續多列欄數一致」的判準對它不成立。
 * 所以順序是**先接回列的邊界，再補分隔列，最後才驗**。
 *
 * ## 這個缺陷是偶發的，而那件事會影響怎麼修
 *
 * 同一份原檔、同一個 commit，2026-08-14 一趟丟三張表、另一趟零張。
 * 所以它不是原檔的性質，是模型輸出的變異 —— 不能靠重跑匯入來確認修好了。
 * 本檔的測試素材因此全部來自 log 抓到的實際字串（見測試檔），
 * 而驗收條件是「連續兩趟匯入零 `not_a_table`」而不是一趟。
 *
 * ## 兩個錯的代價不對稱，護欄從這裡推出來
 *
 * `carbon_source_table.builder` 的檔頭已經寫過這個立場：誤收一段散文會被
 * 逐字照錄的原則與表號驗證擋下，**誤丟一張表卻是無聲的**。
 *
 * 但這支比補分隔列危險一階：接錯會**把兩列併成一列**，
 * 那會讓後面每一格都往左移一位 —— 一個氣體的排放量被標成別的名目，
 * 而表格看起來完全正常。所以護欄取的是「寧可不接」：
 *
 * 1. 全文至少要有一列是完整閉合的（見 `hasClosedRow`）
 * 2. 續行不得以 `|` 開頭 —— 那更可能是另一列，不是被折斷的內容
 * 3. 續行不得是空行 —— 空行是段落邊界
 * 4. 續行數有上限；上限之內接不完就整段放棄，不留半成品
 * 5. 接完的那一列必須至少兩格，否則不算列
 *
 * 放棄時維持現行行為（交回原樣、由驗證器擋下並記 log），
 * 那是一個已知且看得見的結果；接錯則是看不見的。
 */

const CLOSED_ROW = /^\|.*\|$/;
/** Info: (20260814 - Emily) 以 `|` 開頭但沒有以 `|` 收尾 —— 被折斷的列首 */
const OPEN_ROW = /^\|.*[^|]$/;

/**
 * Info: (20260814 - Emily) 一格最多被折成幾行。
 *
 * log 裡實際看到的都是 2 個續行（表4.1、表4.4 的表頭各佔三行）。
 * 取 4 是留餘裕但仍能把散文擋在外面：一段散文的第五行以內湊巧以 `|` 收尾，
 * 而中間沒有任何一行以 `|` 開頭 —— 那不太可能。
 */
const MAX_CONTINUATION_LINES = 4;

const cellCount = (line: string): number =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/).length;

/**
 * Info: (20260814 - Emily) 只有兩邊都是 ASCII 字母數字才補空白。
 *
 * 折斷處是**一格內部**被切開的地方，接回去時不該改變原文。
 * CJK 不用空白分詞（`活動` + `或設` → `活動或設`），
 * 而 `-` 也不能被空白切斷 —— 折斷的分隔列 `| --- | ---` + `--- |`
 * 補了空白會變成 `| --- | --- --- |`，那不是合法的分隔格。
 * 只有兩個拉丁詞之間需要空白（`emission` + `factor`）。
 */
const isAsciiWord = (char: string): boolean => /^[A-Za-z0-9]$/.test(char);

const joinFragments = (left: string, right: string): string => {
  if (left === "") return right;
  if (right === "") return left;
  return isAsciiWord(left.slice(-1)) && isAsciiWord(right.slice(0, 1))
    ? `${left} ${right}`
    : `${left}${right}`;
};

/**
 * Info: (20260814 - Emily) 全文至少有一列完整閉合，才承認「未閉合」是異常。
 *
 * GFM 允許省略首尾的 `|`，所以 `| 甲 | 乙` 後面接 `1 | 2` 是一張合法的表 ——
 * 兩列都沒有收尾的 `|`。對那種表硬接，會把兩列併成一列而且看不出來：
 *
 *     | 甲 | 乙        →   | 甲 | 乙1 | 2 3 | 4 |
 *     1 | 2
 *     3 | 4 |
 *
 * 反過來說，同一段裡若有別的列是 `| ... |` 收尾的，這張表的慣例就是首尾都有 `|`，
 * 未閉合的那一行才真的是被折斷的。這個條件是分辨兩者的唯一線索，
 * 而沒有線索的時候本專案的立場一律是**不猜**。
 *
 * 代價：整張表每一列都被折斷（連一列閉合的都沒有）時救不回來。
 * 那種表維持現行行為 —— 被丟掉並且 log 有記，是看得見的結果。
 */
const hasClosedRow = (lines: readonly string[]): boolean =>
  lines.some((line) => {
    const trimmed = line.trim();
    return CLOSED_ROW.test(trimmed) && cellCount(trimmed) >= 2;
  });

/**
 * Info: (20260814 - Emily) 把被折斷的列接回一行。決定性、冪等。
 *
 * 回傳 `joined` = 實際接回的列數。呼叫端要記 log ——
 * 那是「原文長得不標準」的訊號，累積起來要回頭改匯入 prompt，
 * 而不是讓這支函式永遠替 prompt 擦屁股。
 */
export const joinWrappedTableRows = (
  markdown: string,
): { markdown: string; joined: number } => {
  const lines = markdown.split("\n");
  if (!hasClosedRow(lines)) return { markdown, joined: 0 };

  const output: string[] = [];
  let joined = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!OPEN_ROW.test(line.trim())) {
      output.push(line);
      continue;
    }

    const indent = line.match(/^\s*/)?.[0] ?? "";
    let merged = line.trim();
    let cursor = index;
    let closed = false;

    for (let step = 1; step <= MAX_CONTINUATION_LINES; step += 1) {
      const next = lines[index + step];
      if (next === undefined) break;
      const trimmed = next.trim();
      // Info: (20260814 - Emily) 空行是段落邊界;以 `|` 開頭的更可能是另一列
      if (trimmed === "" || trimmed.startsWith("|")) break;

      merged = joinFragments(merged, trimmed);
      cursor = index + step;
      if (CLOSED_ROW.test(merged)) {
        closed = true;
        break;
      }
    }

    // Info: (20260814 - Emily) 接不成、或接完不足兩格 —— 整段放棄，不留半成品
    if (!closed || cellCount(merged) < 2) {
      output.push(line);
      continue;
    }

    output.push(`${indent}${merged}`);
    joined += 1;
    index = cursor;
  }

  return { markdown: output.join("\n"), joined };
};
