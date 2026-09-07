/**
 * Info: (20260812 - Emily) 逐行判定「這一行是不是程式碼」。
 *
 * ## 為什麼要抽出來
 *
 * `markdown_arithmetic_safety` 與 `markdown_line_structure` 各自帶著同一份
 * `const FENCE = /^\s*(```|~~~)/` 加一個布林旗標,而那份實作有四個洞:
 *
 * 1. **兩種圍籬字元共用一個旗標** —— ``` 圍籬內只要有一行以 `~~~` 開頭,
 *    旗標就被翻掉,**之後整份文件的內外判斷全部相反**。實測一段引用了 `~~~`
 *    的範例文字,可以讓它後面所有真正的算式都失去保護。
 * 2. **不記圍籬長度** —— 四反引號包住三反引號(教學範例的寫法)時,內層被當成閉籬。
 * 3. **未閉合的圍籬**沒有定義行為。
 * 4. **4 空白縮排的 code block 完全沒處理** —— 逸出因此會在那裡加反斜線,
 *    而 `markdown_arithmetic_safety` 開頭那句「在那裡加反斜線不是防護而是污染」
 *    對縮排 code 一字不改地成立。實測 `    0.6*200*248=1` 產出
 *    `<pre><code>0.6\*200\*248=1</code></pre>`,兩個反斜線直接印在報告上。
 *
 * 四個洞的後果都一樣:保護在該生效的地方失效、或在不該作用的地方污染內容。
 * 兩份實作各修一次會分岔,所以收成一支並單獨測試。
 *
 * ## 判定規則（依 CommonMark）
 *
 * 開籬記住**字元與長度**,只有「同字元且長度不小於開籬」的行才閉合;
 * 未閉合的圍籬延伸到文件結尾。
 *
 * ## 縮排 code 的判定刻意保守
 *
 * 誤判的兩個方向代價不對稱:
 * - 少判(把縮排 code 當內文)→ 反斜線印在程式碼區塊裡。難看,但看得見。
 * - 多判(把內文當縮排 code)→ 那一行的算式失去保護 → 數字被 markdown 合併。
 *   看不見,而且會進申報數值。
 *
 * 所以只在**明確**的情況下判為縮排 code:前一行是空行(或文件開頭)、
 * 且最近的非空行不是清單項目。清單項目底下縮排的內容(續段、清單內的
 * code block)一律當內文 —— 那是刻意選了「難看但看得見」的那一邊。
 */

export enum MarkdownLineKind {
  /** Info: (20260812 - Emily) 一般內文:轉換該作用的地方 */
  PROSE = "PROSE",
  /** Info: (20260812 - Emily) 開籬或閉籬那一行本身 */
  FENCE_MARKER = "FENCE_MARKER",
  /** Info: (20260812 - Emily) 圍籬內的程式碼 */
  FENCED_CODE = "FENCED_CODE",
  /** Info: (20260812 - Emily) 4 空白或 tab 縮排的程式碼區塊 */
  INDENTED_CODE = "INDENTED_CODE",
}

// Info: (20260812 - Emily) CommonMark: 圍籬前最多 3 個空白,至少 3 個同種字元
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
// Info: (20260812 - Emily) 閉籬那一行除了圍籬字元只能有空白（不能有 info string）
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const INDENTED = /^(?: {4}|\t)/;
const LIST_ITEM = /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]/;

/**
 * Info: (20260812 - Emily) 回傳與輸入等長的分類陣列。
 * 空行歸 `PROSE`（呼叫端本來就會各自處理空行,這裡不多發明一種類別）。
 */
export const classifyMarkdownLines = (
  lines: readonly string[],
): MarkdownLineKind[] => {
  const kinds: MarkdownLineKind[] = [];
  let openChar = "";
  let openLength = 0;
  let previousWasBlank = true;
  let previousKind: MarkdownLineKind = MarkdownLineKind.PROSE;
  let previousNonBlank = "";

  lines.forEach((line) => {
    const blank = line.trim() === "";
    let kind: MarkdownLineKind;

    if (openLength > 0) {
      const close = FENCE_CLOSE.exec(line);
      const closes =
        close !== null &&
        close[1][0] === openChar &&
        close[1].length >= openLength;
      if (closes) {
        openChar = "";
        openLength = 0;
        kind = MarkdownLineKind.FENCE_MARKER;
      } else {
        kind = MarkdownLineKind.FENCED_CODE;
      }
    } else {
      const open = FENCE_OPEN.exec(line);
      if (open) {
        openChar = open[1][0];
        openLength = open[1].length;
        kind = MarkdownLineKind.FENCE_MARKER;
      } else if (
        !blank &&
        INDENTED.test(line) &&
        (previousWasBlank || previousKind === MarkdownLineKind.INDENTED_CODE) &&
        !LIST_ITEM.test(previousNonBlank)
      ) {
        kind = MarkdownLineKind.INDENTED_CODE;
      } else {
        kind = MarkdownLineKind.PROSE;
      }
    }

    kinds.push(kind);
    previousKind = kind;
    previousWasBlank = blank;
    if (!blank) previousNonBlank = line;
  });

  return kinds;
};

/** Info: (20260812 - Emily) 轉換不該作用的行（圍籬標記本身也不該動） */
export const isMarkdownCodeLine = (kind: MarkdownLineKind): boolean =>
  kind !== MarkdownLineKind.PROSE;
