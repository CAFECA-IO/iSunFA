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
 * 6. **接完的那一列不得比同段裡最寬的完整列更寬**（見 `widestClosedRow`）
 * 7. **續行本身若「補上前導管線就是一個寬度符合本表的合法列」，就不是折斷碎片**
 *    （見 `closedRowWidths`）—— 那是一列，不是一格的下半截
 *
 * ## 第 6 條的由來：第 2 條擋不住「混用前導管線」（08-21 PR review 指出）
 *
 * 本檔原本聲稱「擋住併列的是第 1、2 條，兩者都與續行數無關」。**那句話錯了**，
 * 它成立的前提是「每一列都有前導管線」，而 GFM 允許省略首尾管線、原文可以混用：
 *
 *     | 氣體 | 排放量 |
 *     | CO2 | 1000
 *     CH4 | 2000 |
 *
 * `CH4 | 2000 |` 不以 `|` 開頭，於是被當成續行接進上一列 ——
 * **CH4 整列消失，2000 落進 CO2 的欄位**。而接出來的是一個閉合、≥2 格的列，
 * `validateSourceTables` 會接受，沒有任何 log 說少了一列。
 * 那正是本檔一開始就寫著「比丟一張表嚴重得多」的那一類。
 *
 * 這個弱點是既有的（上限 4 時一個續行就足以發生），但把上限放寬到 32 之後，
 * 最多能吞掉的真實資料列從 4 放大到 32，所以必須在這一輪處理。
 *
 * ### 為什麼判準是「不得比最寬的完整列更寬」
 *
 * 折斷是把**一列**切成多行，接回後的寬度必然是這張表真實存在的某個列寬，
 * 因此不可能超過同段裡最寬的完整列。而「吞掉別的列」必然讓寬度累加、超過那個上限。
 * 實測（本尊素材與 review 給的混用案例）：
 *
 *     表4.4          最寬完整列 14   接回產生 13、14   通過
 *     表4.8          最寬完整列 13   接回產生 13       通過
 *     混用（2 列）    最寬完整列 2    接回產生 3        擋下
 *     混用（4 列）    最寬完整列 2    接回產生 5        擋下
 *
 * **不採用「須等於分隔列寬」**（review 給的選項一的字面版本）：實測 `表4.4` 的分隔列
 * 是 13 格而它的資料列是 14 格（廠址標籤列才是 13），那個判準會擋掉三個完整的資料列。
 *
 * ### 第 6 條的餘裕是 0，所以還需要第 7 條
 *
 * 實測本尊素材：
 *
 *     表4.4  完整列 9 列，最寬 14   接回產生 13、14   餘裕 0
 *     表4.8  完整列 2 列，最寬 13   接回產生 13       餘裕 0
 *
 * **兩份都剛好貼齊上限。** 第 6 條通過是因為「最寬的完整列恰好與被折斷的那一列同寬」，
 * 那是運氣不是設計 —— `表4.8` 173 行裡只有 2 列完整閉合，那一趟若連它們也被折斷、
 * 只剩一列較窄的標籤列，整張表就會被第 6 條擋掉。
 *
 * 第 7 條不依賴那個餘裕，它直接問「這個續行本身是不是一列」：
 *
 *     CH4 | 2000 |   →  | CH4 | 2000 |  = 2 格 = 本表列寬  →  是一列，不接
 *     程度 |          →  | 程度 |        = 1 格 ≠ 13        →  是碎片，接
 *     限 | |          →  | 限 | |        = 2 格 ≠ 13        →  是碎片，接
 *
 * 三份本尊素材**零誤判**，兩個混用案例都抓到（量測見 PR 說明）。
 *
 * ### 兩條都留，因為抓的不是同一件事
 *
 * 第 7 條抓「被吞掉的列寬度剛好等於本表列寬」；第 6 條抓「寬度累加超過表寬」
 * （表寬 5、被吞的列 3 格 → 合併成 7 格：第 7 條漏、第 6 條抓到）。
 *
 * 兩條各自計數（`refusedTooWide` / `refusedLooksLikeRow`）並分別記 log。
 * **第 6 條的 0 餘裕因此是可觀測的**：`refusedTooWide` 一旦在真實匯入裡非 0，
 * 就代表那個情況到了，而我們會當場知道，不是靠註解提醒下一個人。
 *
 * 放棄時維持現行行為（交回原樣、由驗證器擋下並記 log），
 * 那是一個已知且看得見的結果；接錯則是看不見的。
 */

import { countTableCells } from "@/lib/utils/markdown_table_cells";

const CLOSED_ROW = /^\|.*\|$/;
/** Info: (20260814 - Emily) 以 `|` 開頭但沒有以 `|` 收尾 —— 被折斷的列首 */
const OPEN_ROW = /^\|.*[^|]$/;

/**
 * Info: (20260820 - Emily) 一格最多被折成幾行。**4 → 32,依 08-20 run D 的實測。**
 *
 * 原本取 4,理由是「log 裡實際看到的都是 2 個續行」。08-20 run D 推翻了那個假設:
 * 表4.4 與 表4.8 被 `not_a_table` 整張丟掉,量測那兩份 payload 的折斷段:
 *
 *     表4.4  折斷 4 段,所需續行數 5 / 5 / 6 / 16
 *     表4.8  折斷 16 段,所需續行數 6…29(眾數 8)
 *
 * 每一段都超過 4,所以兩張表的每一列都放棄接回 → 整張丟掉。
 * 表4.8 是 173 列的排放源不確定性分析,單筆代價最大的靜默丟失。
 *
 * ## 為什麼不是改用「碎片長度」當判準
 *
 * 折斷的碎片看起來很短(`或設`、`區間之下`),所以「短碎片才接」是個很自然的想法。
 * 實測不成立:187 條續行碎片的中位長度是 5 字,但有 26 條超過 20 字、最長 89 字。
 * 拿長度當門檻會在半路切斷這兩張表,比不接更糟(半張表沒有 log 說它少了什麼)。
 *
 * ## 放寬的是哪一道護欄,以及為什麼可以放寬
 *
 * 危險的錯是**把兩列併成一列**(後面每一格左移一位,一個氣體的排放量標成別的名目)。
 * 擋住那件事的是「續行不得以 `|` 開頭」與「全文至少一列完整閉合」,
 * 兩者都與續行數無關,一個都沒動。
 *
 * 續行數只擋一種情況:把散文吸進表格列。而這裡的輸入是模型已經宣告為表格、
 * 且通過表號驗證的 `sourceTables[].markdown`,不是自由段落;吸進散文的後果也是
 * 一格內容變醜(看得見),不是欄位錯位(看不見)。用「無聲的丟表」換「看得見的變醜」
 * 是這個檔頭一路的立場。
 *
 * 32 是實測最大值 29 再留餘裕。用掉超過 4 個續行時呼叫端會記 log ——
 * 放寬不能是靜默的,累積起來要回頭改匯入 prompt。
 */
export const MAX_CONTINUATION_LINES = 32;

// Info: (20260820 - Emily) 超過這個續行數就記 log:它是「原文長得不標準」的強訊號
export const CONTINUATION_LINES_NOTEWORTHY = 4;

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
    return CLOSED_ROW.test(trimmed) && countTableCells(trimmed) >= 2;
  });

/**
 * Info: (20260821 - Emily) 同一段裡最寬的完整列 —— 接回結果的寬度上限（第 6 條護欄）。
 * 只算 ≥2 格的閉合列,與 `hasClosedRow` 同一個門檻。
 */
/**
 * Info: (20260821 - Emily) 同一段裡所有完整列的寬度集合 —— 第 7 條護欄的依據。
 * `hasClosedRow` 已保證至少有一列,所以這個集合不會是空的。
 */
const closedRowWidths = (lines: readonly string[]): ReadonlySet<number> => {
  const widths = new Set<number>();
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!CLOSED_ROW.test(trimmed)) return;
    const width = countTableCells(trimmed);
    if (width >= 2) widths.add(width);
  });
  return widths;
};

const widestClosedRow = (lines: readonly string[]): number =>
  lines.reduce((widest, line) => {
    const trimmed = line.trim();
    if (!CLOSED_ROW.test(trimmed)) return widest;
    const width = countTableCells(trimmed);
    return width >= 2 ? Math.max(widest, width) : widest;
  }, 0);

/**
 * Info: (20260814 - Emily) 把被折斷的列接回一行。決定性、冪等。
 *
 * 回傳 `joined` = 實際接回的列數。呼叫端要記 log ——
 * 那是「原文長得不標準」的訊號，累積起來要回頭改匯入 prompt，
 * 而不是讓這支函式永遠替 prompt 擦屁股。
 */
export const joinWrappedTableRows = (
  markdown: string,
): {
  markdown: string;
  joined: number;
  maxContinuations: number;
  refusedTooWide: number;
  refusedLooksLikeRow: number;
} => {
  const lines = markdown.split("\n");
  if (!hasClosedRow(lines)) {
    return {
      markdown,
      joined: 0,
      maxContinuations: 0,
      refusedTooWide: 0,
      refusedLooksLikeRow: 0,
    };
  }

  const ceiling = widestClosedRow(lines);
  const tableWidths = closedRowWidths(lines);
  const output: string[] = [];
  let joined = 0;
  let maxContinuations = 0;
  let refusedTooWide = 0;
  let refusedLooksLikeRow = 0;

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

      /*
       * Info: (20260821 - Emily) 第 7 條護欄:這個續行補上前導管線之後,
       * 若成為一個寬度符合本表的合法列,它就是一列而不是一格的下半截。
       * GFM 允許省略首尾管線,所以原文混用時「不以 `|` 開頭」不足以判定它是續行。
       */
      const asRow = `|${trimmed}`;
      if (CLOSED_ROW.test(asRow) && tableWidths.has(countTableCells(asRow))) {
        refusedLooksLikeRow += 1;
        break;
      }

      merged = joinFragments(merged, trimmed);
      cursor = index + step;
      if (CLOSED_ROW.test(merged)) {
        closed = true;
        break;
      }
    }

    // Info: (20260814 - Emily) 接不成、或接完不足兩格 —— 整段放棄，不留半成品
    if (!closed || countTableCells(merged) < 2) {
      output.push(line);
      continue;
    }

    /*
     * Info: (20260821 - Emily) 第 6 條護欄：接完比同段最寬的完整列還寬 = 吞掉了別的列。
     * 交回原樣讓驗證器擋下並記 log —— 看得見的失敗勝過欄位悄悄左移。
     */
    if (countTableCells(merged) > ceiling) {
      refusedTooWide += 1;
      output.push(line);
      continue;
    }

    output.push(`${indent}${merged}`);
    joined += 1;
    maxContinuations = Math.max(maxContinuations, cursor - index);
    index = cursor;
  }

  return {
    markdown: output.join("\n"),
    joined,
    maxContinuations,
    refusedTooWide,
    refusedLooksLikeRow,
  };
};
