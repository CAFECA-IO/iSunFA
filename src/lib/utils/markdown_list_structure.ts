/**
 * Info: (20260814 - Emily) 一行裡塞了整份清單時，在項目標記前補回換行
 * (`data/issue_drafts/open/26_import_uat.md` 的觀察項)。
 *
 * ## 與 `restoreLineStructure` 的分工
 *
 * `restoreLineStructure` 解的是「換行在來源裡但被渲染器收掉」——
 * 它加行尾兩空白，把軟斷行變成硬斷行。前提是**換行本來就在**。
 *
 * 這支解的是換行**根本不在**的情況。2026-08-14 新開房重新匯入實測：
 *
 * | | 08-12 下載件 | 08-14 新匯入件 |
 * | --- | --- | --- |
 * | `●` 獨立成行 | 54 個 | **3 個** |
 * | 一行 ≥2 個 `●` | 1 行 | 4 行 |
 *
 * 也就是說模型這一趟幾乎沒有輸出那些換行 —— 同一份原檔、同一組 prompt。
 * 這件事跟表格被折斷（`open/28`）是同一個性質：**模型輸出的變異**，
 * 不是原檔的性質。所以真正的修法在 prompt，本檔是決定性的防線。
 *
 * 實測最嚴重的一段：`3.2.3 各排放係數說明` 把 (1)~(31) 全部塞在同一行。
 *
 * ## 判準：同一族標記出現多次，而且是遞增的
 *
 * 「出現多次」單獨不夠 —— 這一行是實測抓到的真實內容：
 *
 *     溫室氣體排放係數管理表 6.0.4 版（燃料熱值）、溫室氣體排放係數管理表 6.0.4 版（逸散排放源）
 *
 * `6.0.4` 符合 `x.y.z`，出現兩次，但它是同一個版本號而不是兩個項目。
 * 在它前面斷行會把句子切斷。
 *
 * **遞增**是分辨兩者的判準：`1.6.1 → 1.6.2 → 1.6.3` 是清單，
 * `6.0.4 → 6.0.4` 不是。這個判準在四個實測案例上都成立，
 * 而且它不需要理解語意 —— 純粹是序號的性質。
 *
 * ## 為什麼不順手把它變成 markdown 清單
 *
 * 因為那會改動內容。ADR 014 要求 `content` 逐字照抄原文，
 * 而把 `● 總公司：…` 改寫成 `- 總公司：…` 是改字。
 * 補一個換行不改任何一個字元，`restoreLineStructure` 接手之後就是硬斷行 ——
 * 這正是 08-12 那份草稿裡 54 個 `●` 的樣子，渲染沒有問題。
 */

import {
  classifyMarkdownLines,
  isMarkdownCodeLine,
} from "@/lib/utils/markdown_fence";
import { OFFICE_SYMBOL_REPLACEMENTS } from "@/lib/utils/office_symbol_chars";

const TABLE_ROW = /^\s*\|/;

/**
 * Info: (20260814 - Emily) 只認項目符號，不認核取方塊與勾號。
 *
 * `☐` `☑` `✓` 也在 Word 符號對照表裡，但它們在這份報告是**值**
 * （表格裡標記某個氣體有無排放），不是清單標記。
 * 在值前面斷行是純粹的破壞，而它換不到任何可讀性。
 */
const BULLET_GLYPHS: ReadonlySet<string> = new Set([
  "●",
  "■",
  "◆",
  "▪",
  "•",
  "➢",
]);

/**
 * Info: (20260814 - Emily) 同時認私有區原字與替換後的字。
 *
 * `replaceOfficeSymbolChars` 在兩個渲染端的位置不同
 * （`carbon_report_html` 排在 `restoreLineStructure` 之後），
 * 所以本檔不能假設自己看到的是哪一種形態。從對照表推出兩邊的字集，
 * 這支就與鏈上的順序無關 —— 也不會在對照表新增條目時漏掉。
 */
const BULLETS: ReadonlySet<string> = new Set(
  Object.entries(OFFICE_SYMBOL_REPLACEMENTS)
    .filter(([, glyph]) => BULLET_GLYPHS.has(glyph))
    .flatMap(([privateUse, glyph]) => [privateUse, glyph]),
);

/**
 * Info: (20260814 - Emily) `委員: ` —— 同一個標籤重複多次
 * (`data/issue_drafts/open/35_repeated_label_and_flat_numbering.md`)。
 *
 * 1.4 節的正文把 11 個 `委員: ` 塞在同一行，那是 59 頁實測件唯一剩下的文字牆。
 * 標籤長度限 2~8 字：短於 2 字的「詞 + 冒號」太容易誤中，
 * 長於 8 字的不是標籤而是一句話。
 */
const LABEL_ITEM = /([^\s:：]{2,8})[:：]/g;
/** Info: (20260814 - Emily) `1. ` —— 單層編號；後面不得接數字，否則是小數或 `6.0.4` */
const FLAT_ITEM = /(?<![\d.])(\d{1,2})\.(?!\d)/g;
/** Info: (20260814 - Emily) `1.6.2` —— 三層以上的編號，前後不得再接數字或點 */
const DOTTED_ITEM = /(?<![\d.])(\d+\.\d+\.)(\d+)(?![\d.])/g;
/** Info: (20260814 - Emily) `(1)` 與全角 `（1）` */
const PAREN_ITEM = /[(（](\d{1,2})[)）]/g;

/**
 * Info: (20260814 - Emily) 括號序號要三個才動手，編號與符號兩個就夠。
 *
 * `(1)` 這種標記在散文裡也會出現（「依 (1) 與 (2) 之規定」），
 * 而 `●` 與 `1.6.2` 幾乎只當標記用 —— 實測 08-12 那份全文只有 1 行有兩個 `●`，
 * 訊號非常乾淨。門檻按各族標記的專一性分別設，而不是統一取一個數字。
 */
const MIN_BULLETS = 2;
const MIN_DOTTED = 2;
const MIN_PARENS = 3;
/**
 * Info: (20260814 - Emily) 重複標籤要三次才算清單。
 *
 * 兩次太鬆 —— 一段散文裡同一個詞加冒號出現兩次並非不可能（問答、對照）。
 * 三次開始就不像巧合了：清單必然重複，散文不會。
 */
const MIN_LABEL_REPEATS = 3;
/**
 * Info: (20260814 - Emily) 單層編號是本檔最危險的一族，三條同時成立才動手。
 *
 * `N.` 也是小數點、版本號、句末序號。所以要求：**從 1 開始、嚴格遞增、至少三個**。
 * 缺一條都不動 —— `6.0.4` 靠 `(?!\d)` 就排除了，但「第 3. 項」這種
 * 單獨出現的序號只能靠數量與起點擋。
 */
const MIN_FLAT_ITEMS = 3;

const isStrictlyAscending = (values: readonly number[]): boolean =>
  values.every((value, index) => index === 0 || value > values[index - 1]);

/** Info: (20260814 - Emily) 這一族標記在這一行的切點（0 代表行首，不算切點） */
const bulletOffsets = (line: string): number[] => {
  const offsets: number[] = [];
  for (let index = 0; index < line.length; index += 1) {
    if (BULLETS.has(line[index])) offsets.push(index);
  }
  return offsets.length >= MIN_BULLETS ? offsets : [];
};

const dottedOffsets = (line: string): number[] => {
  // Info: (20260814 - Emily) 按前綴分組:`1.6.x` 與 `6.0.x` 是兩族，不能混著判遞增
  const groups = new Map<string, { offset: number; value: number }[]>();
  for (const match of line.matchAll(DOTTED_ITEM)) {
    const prefix = match[1];
    const entry = { offset: match.index, value: Number(match[2]) };
    groups.set(prefix, [...(groups.get(prefix) ?? []), entry]);
  }
  return [...groups.values()]
    .filter(
      (entries) =>
        entries.length >= MIN_DOTTED &&
        isStrictlyAscending(entries.map((entry) => entry.value)),
    )
    .flatMap((entries) => entries.map((entry) => entry.offset));
};

/**
 * Info: (20260814 - Emily) 同一個標籤重複 ≥3 次的那幾個位置。
 *
 * 純數字的標籤不算：`10:30 10:45 10:50` 的標籤都是 `10`，會湊成一組三次，
 * 而那是時刻不是清單。數字開頭的項目由 `FLAT_ITEM` 與 `DOTTED_ITEM` 兩族負責。
 */
const labelOffsets = (line: string): number[] => {
  const groups = new Map<string, number[]>();
  for (const match of line.matchAll(LABEL_ITEM)) {
    const label = match[1];
    if (/^[\d.]+$/.test(label)) continue;
    groups.set(label, [...(groups.get(label) ?? []), match.index]);
  }
  return [...groups.values()]
    .filter((offsets) => offsets.length >= MIN_LABEL_REPEATS)
    .flat();
};

/**
 * Info: (20260814 - Emily) 單層編號 `1. 2. 3.`。
 *
 * 必須**從 1 開始**且嚴格遞增：不從 1 開始的話無法分辨「清單的續段」與
 * 「散文裡剛好遞增的兩三個數字」，而前者少見、後者不少見。寧可不斷。
 */
const flatOffsets = (line: string): number[] => {
  const found = [...line.matchAll(FLAT_ITEM)].map((match) => ({
    offset: match.index,
    value: Number(match[1]),
  }));
  if (found.length < MIN_FLAT_ITEMS) return [];
  if (found[0].value !== 1) return [];
  if (!isStrictlyAscending(found.map((entry) => entry.value))) return [];
  return found.map((entry) => entry.offset);
};

const parenOffsets = (line: string): number[] => {
  const found = [...line.matchAll(PAREN_ITEM)].map((match) => ({
    offset: match.index,
    value: Number(match[1]),
  }));
  if (found.length < MIN_PARENS) return [];
  if (!isStrictlyAscending(found.map((entry) => entry.value))) return [];
  return found.map((entry) => entry.offset);
};

/**
 * Info: (20260814 - Emily) 在項目標記前補換行。決定性、冪等。
 *
 * 冪等的理由：切完之後每一行最多只剩一個標記，而它落在行首 ——
 * 行首的標記不算切點，所以第二次跑什麼都不會做。
 *
 * 回傳 `inserted` = 補了幾個換行。呼叫端要記 log ——
 * 這是「模型沒有輸出換行」的訊號，累積起來要回頭改 prompt。
 */
export const splitInlineListItems = (
  markdown: string,
): { markdown: string; inserted: number } => {
  const lines = markdown.split("\n");
  const kinds = classifyMarkdownLines(lines);
  let inserted = 0;

  const output = lines.map((line, index) => {
    // Info: (20260814 - Emily) 圍籬與表格列有自己的斷行語意,與 restoreLineStructure 同一組排除
    if (isMarkdownCodeLine(kinds[index]) || TABLE_ROW.test(line)) return line;

    const cuts = [
      ...new Set([
        ...bulletOffsets(line),
        ...dottedOffsets(line),
        ...parenOffsets(line),
        ...labelOffsets(line),
        ...flatOffsets(line),
      ]),
    ]
      .sort((left, right) => left - right)
      // Info: (20260814 - Emily) 標記前面只有空白時已經是行首,不需要再斷
      .filter((offset) => line.slice(0, offset).trim() !== "");

    if (cuts.length === 0) return line;

    inserted += cuts.length;
    const pieces: string[] = [];
    let cursor = 0;
    for (const offset of cuts) {
      pieces.push(line.slice(cursor, offset).replace(/\s+$/, ""));
      cursor = offset;
    }
    pieces.push(line.slice(cursor));
    return pieces.join("\n");
  });

  return { markdown: output.join("\n"), inserted };
};
