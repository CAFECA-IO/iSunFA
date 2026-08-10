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

/**
 * Info: (20260810 - Emily) 已被轉義的星號不再重複轉義(`(?<!\\)`)。
 * 冪等性是必要的:這支函式套用在三個地方(組裝段落、預覽、列印),
 * 而既有草稿裡的內容會經過不只一次 —— 二次轉義會印出一個字面反斜線。
 */
const ARITHMETIC_STAR = /(?<!\\)(?<=[0-9)])\*(?=[0-9(])/g;

const FENCE = /^\s*(```|~~~)/;

export const escapeArithmeticEmphasis = (markdown: string): string => {
  if (!markdown.includes("*")) return markdown;

  let insideFence = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (FENCE.test(line)) {
        insideFence = !insideFence;
        return line;
      }
      return insideFence ? line : line.replace(ARITHMETIC_STAR, "\\*");
    })
    .join("\n");
};
