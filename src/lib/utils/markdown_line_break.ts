// Info: (20260804 - Tzuhan) 儲存格內的 HTML 換行標籤(`<br>`)清除:單一實作,兩層共用。
//
// Info: (20260804 - Tzuhan) 來源:模型逐字照錄 PDF 表格時,會用 `<br>` 表示原文版面的折行。
// Info: (20260804 - Tzuhan) 那是**版面不是內容** —— 逐字照錄的對象是儲存格的文字,不是它在紙上換了幾行。
// Info: (20260804 - Tzuhan) 這與 carbon_table38.parser 的 stripEmphasis 是同一句話:排版不算內容。
//
// Info: (20260804 - Tzuhan) 為什麼不改存下來的 markdown:原文表格的合約是逐字照錄,
// Info: (20260804 - Tzuhan) 寫進 DB 的必須是模型原話,否則「照錄」二字就不成立。
// Info: (20260804 - Tzuhan) 因此清除發生在**讀取時**——解析數值時一次、渲染畫面時一次。
//
// Info: (20260804 - Tzuhan) 為什麼放在共用模組:兩層各寫一份 regex,遲早不一致,
// Info: (20260804 - Tzuhan) 而不一致的表現是「圖上的廠址名跟畫面上的不一樣」——查核系統裡這是致命的。
// Info: (20260804 - Tzuhan) 兩個呼叫端、一份實作。

import { FENCE_PATTERN } from "@/lib/utils/markdown_comment";

/** Info: (20260804 - Tzuhan) `<br>` / `<br/>` / `<br />`,大小寫不拘 */
const HTML_LINE_BREAK_PATTERN = /<br\s*\/?>/gi;

/**
 * Info: (20260804 - Tzuhan) 折行處該不該補一個空白:**只有兩側都是 ASCII 英數時才補**。
 *
 * 判準不是「是不是中文」,是「原文本來有沒有空白」——
 * PDF 折行只會吃掉本來就存在的空白,而只有以空白分詞的書寫系統才有那個空白。
 *
 * 我第一版用「兩側是不是中日韓字元」判斷,結果是錯的:
 * `1.<br>1 固定式燃燒` 的兩側是 `.` 與 `1`,都不是中日韓字元 → 補了空白 → `1. 1`
 * → 子代碼比對不到 → **整列被丟掉**。同理 `9.<br>0759` 會變成 `9. 0759` 解不出數字。
 * 折行落在數字中間是 PDF 表格的常態,那一版等於把最該修的情形修壞。
 *
 * 現在的規則對所有實測形狀都成立:
 * `工業<br>冷凍` → 不補、`1.<br>1` → 不補、`2,775.<br>6475` → 不補、
 * `，<br>四氟乙烷` → 不補、`Total<br>emissions` → 補、`24<br>0.5` → 補。
 *
 * 代價:`R-410a<br>冷媒` 會黏成 `R-410a冷媒`(少一個空白)。
 * 那是外觀問題;上面那些是資料問題,兩者不對等。
 */
const ASCII_ALPHANUMERIC_PATTERN = /[A-Za-z0-9]/;

const isAsciiAlphanumeric = (char: string | undefined): boolean =>
  char !== undefined && ASCII_ALPHANUMERIC_PATTERN.test(char);

/**
 * Info: (20260804 - Tzuhan) 移除 HTML 換行標籤;僅在兩側都是 ASCII 英數時補一個空白。
 *
 * 純函數。**不做空白收斂** —— markdown 的行尾兩個空白是有語意的(等同換行),
 * 全域收斂會改變渲染結果,那是另一種靜默改寫。
 */
export function stripHtmlLineBreaks(text: string): string {
  return text.replace(HTML_LINE_BREAK_PATTERN, (match, offset: number) => {
    const before = text[offset - 1];
    const after = text[offset + match.length];
    return isAsciiAlphanumeric(before) && isAsciiAlphanumeric(after) ? " " : "";
  });
}

// Info: (20260807 - Emily) 僅供 test();刻意不帶 /g —— 帶了會記住 lastIndex 而漏判
const HTML_LINE_BREAK_TEST_PATTERN = new RegExp(
  HTML_LINE_BREAK_PATTERN.source,
  "i",
);

/** Info: (20260804 - Tzuhan) 內容是否含 HTML 換行標籤(顯示層用以避免不必要的重建字串) */
export function hasHtmlLineBreaks(text: string): boolean {
  /**
   * Info: (20260807 - Emily) 用不帶 /g 的模組層常數,不必每次重建
   * (PR review 低優先項)。
   *
   * 原本每次呼叫都 new RegExp,理由是「帶 /g 的 test() 會記住 lastIndex,
   * 共用實例會漏判」—— 那個顧慮是對的,但成因是 /g 而不是共用。
   * 沒有 /g 的實例不帶 lastIndex 狀態,共用完全安全。
   */
  return HTML_LINE_BREAK_TEST_PATTERN.test(text);
}

/**
 * Info: (20260804 - Tzuhan) 顯示層用:清除程式碼區塊**之外**的 `<br>`。
 *
 * 跳過 fence 的理由與 stripMarkdownComments 完全相同 ——
 * 使用者貼 HTML 教學範例時,fence 內的 `<br>` 是內容,吃掉它就是靜默改寫他的文件。
 * 圍欄判斷共用 markdown_comment 的 FENCE_PATTERN,規則只有一份。
 */
export function stripHtmlLineBreaksOutsideFences(content: string): string {
  if (!hasHtmlLineBreaks(content)) return content;
  let inFence = false;
  return content
    .split("\n")
    .map((line) => {
      if (FENCE_PATTERN.test(line)) {
        inFence = !inFence;
        return line;
      }
      return inFence ? line : stripHtmlLineBreaks(line);
    })
    .join("\n");
}
