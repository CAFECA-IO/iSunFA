/**
 * Info: (20260821 - Emily) 「一列有幾格」的正典實作（PR review B1 的同一條規則）。
 *
 * ## 為什麼獨立成一支
 *
 * 這個判定原本有三份完全相同的實作：`markdown_table_divider` 裡兩份
 * （`countTableCells` 與 `splitTableCells`，只差一個 `.length`）、
 * `markdown_table_rows` 的 `cellCount`、`markdown_table_columns` 的 `splitCells`。
 *
 * 它們被一起使用：補分隔列看欄數、接回折斷列看欄數、補欄看欄數，
 * 而**逃脫管線的規則若只改一邊就會分岔** —— 那是 #6679 B1 已經處理過一次的形狀
 * （「NFKC + 去空白」四份實作合併成一份），這裡是同一條規則在表格這一族的應用。
 *
 * ## 刻意不收進來的那一份
 *
 * `carbon_table38.parser.ts` 的 `splitRow` **不是重複，是分岔**：
 * 它用 `.split("|")` 而不是負向回顧，也就是把逃脫的 `\|` 當成欄位邊界，
 * 而且後面還接 `stripEmphasis` / `stripHtmlLineBreaks`。
 * 把它併進來會改變對帳解析器的切格結果、可能移動廠址與排放量的對應，
 * 那不是重構而是行為變更 —— 另開票處理，不在這裡順手做。
 */

/**
 * Info: (20260821 - Emily) 逐格切開。`\|` 是逃脫的直線不是欄位邊界，所以用否定回顧。
 * 先 `trim()`：呼叫端傳進來的行有的帶縮排、有的已經修過，在這裡統一比較不會漏。
 */
export const splitTableCells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/);

/** Info: (20260821 - Emily) 一列有幾個儲存格。與 `splitTableCells` 是同一個判定 */
export const countTableCells = (line: string): number =>
  splitTableCells(line).length;
