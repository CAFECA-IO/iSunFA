/**
 * Info: (20260810 - Emily) 算式裡的星號是乘號,不是 markdown 的強調語法。
 *
 * ## 這是什麼問題
 *
 * 盤查報告的敘述含大量「原文照錄」的計算式,例如化糞池 CH4 排放係數:
 *
 *     0.6*200/1000000000*248*9*15.625*(85/100)=0.00355725
 *
 * markdown 把 `*200/1000000000*` 讀成斜體:星號消失、文字變斜體,而 `248*9*15.625`
 * 變成 `248915.625` —— **兩個數字被合併成一個**。實測 UAT 那份報告有 45 個算式星號、
 * 九條公式被改寫,而查證人員讀到的是一個完全不同的數值,且看不出任何異常。
 *
 * 這不是列印層的問題:預覽用 react-markdown、列印用 marked,兩者遵守同一套強調語法,
 * 所以兩邊早就都是壞的 —— 只是沒人去對照原始數字。
 *
 * ## 為什麼只轉義「兩側都是算式字元」的星號
 *
 * 報告**確實**刻意使用 markdown:表號是 `**表2.1 …**`、擋下的圖說是 `> _…_`。
 * 全部轉義會把那些一起打壞。判準取「星號左邊是數字或右括號、右邊是數字或左括號」——
 * 那個形狀只可能是乘號。實測 209 個星號中,82 個是粗體標記、45 個是乘號,
 * 兩者沒有交集。
 *
 * ## 為什麼跳過程式碼圍籬
 *
 * 圍籬內 markdown 本來就不處理強調,在那裡加反斜線不是防護而是**污染** ——
 * mermaid 圖的定義若含算式,轉義後圖上會多出一個反斜線。
 */

import {
  classifyMarkdownLines,
  isMarkdownCodeLine,
} from "@/lib/utils/markdown_fence";

/**
 * Info: (20260812 - Emily) 冪等性由 `(?<=[0-9)])` 保證,不是由 `(?<!\\)`
 * (PR review 指出)。已經轉義過的 `\*`,它左邊那個字元是 `\` 而 `\` 不在 `[0-9)]` 裡,
 * 所以第二次跑就不會再匹配。原本那個 `(?<!\\)` 是死碼 ——
 * 留著會讓下一個放寬左側字元集的人以為護欄在那裡。
 */
const ARITHMETIC_STAR = /(?<=[0-9)])\*(?=[0-9(])/g;

/**
 * Info: (20260812 - Emily) 行內程式碼也要跳過(PR review 第 2 點)。
 *
 * 本檔原本只跳過圍籬,理由是「圍籬內 markdown 不處理強調,在那裡加反斜線
 * 不是防護而是**污染**」。行內 code span 完全同理,只是當初漏了一種 ——
 * 實測 `` `2*3*4` `` 會被轉義成 `2\*3\*4`,反斜線直接印在報告上。
 *
 * Info: (20260812 - Emily) 開閉的反引號串長度必須相同(CommonMark)。
 * 原本是 /(`+[^`]*`+)/,遇到內含反引號的 span(``a`2*1``)會提早收尾,
 * split 之後奇偶索引錯位 —— 於是 span **內**的算式被當成內文而加了反斜線,
 * 正好是這一段要避免的那件事。而原本守這一條的測試樣本是 ``a`b*1``,
 * `b*1` 的星號左側是字母、本來就不匹配判準,所以那條測試在壞掉時也是綠的。
 */
const CODE_SPAN = /(`+)(?:[^`]|(?!\1)`)*?\1(?!`)/;

/**
 * Info: (20260812 - Emily) 逐段跳過 code span,只在 span 之外逸出。
 * 不用 split:CODE_SPAN 需要反向參照來比對反引號串長度,
 * 而帶捕捉群組的 split 會把群組本身也放進結果,奇偶索引不再成立。
 */
const escapeOutsideCodeSpans = (line: string): string => {
  let escaped = "";
  let rest = line;
  for (;;) {
    const span = CODE_SPAN.exec(rest);
    if (span === null) {
      return escaped + rest.replace(ARITHMETIC_STAR, "\\*");
    }
    escaped +=
      rest.slice(0, span.index).replace(ARITHMETIC_STAR, "\\*") + span[0];
    rest = rest.slice(span.index + span[0].length);
  }
};

export const escapeArithmeticEmphasis = (markdown: string): string => {
  if (!markdown.includes("*")) return markdown;

  const lines = markdown.split("\n");
  // Info: (20260812 - Emily) 圍籬與縮排 code 的判定收在 markdown_fence（四個洞的說明在那裡）
  const kinds = classifyMarkdownLines(lines);
  return lines
    .map((line, index) =>
      isMarkdownCodeLine(kinds[index]) ? line : escapeOutsideCodeSpans(line),
    )
    .join("\n");
};
