/**
 * Info: (20260811 - Emily) Word 私有區符號 → 真的 Unicode
 * (data/issue_drafts/open/20 第 1 張票)。
 *
 * Word 把 Symbol / Wingdings 的字元存成 Unicode 私有使用區(U+F0xx):
 * 字型代碼 0x6C 在 Wingdings 裡是實心圓,存進 PDF 就成了 U+F06C。
 * 從 PDF 文字層抽取時那個碼位原樣進到報告裡,而**私有區沒有任何字型有對應字形**——
 * 瀏覽器與 headless Chrome 都畫成空心方框。
 *
 * 實測那份 UAT 報告:U+F06C 出現 57 次(54 個在行首、3 個夾在行中),
 * 分佈在 p3 與 p17–23,全部是原文的項目符號。
 * 這不是缺字型:裝再多字型也不會有私有區的字形,唯一的解法是換成真的碼位。
 *
 * 只換成可見的符號,不改成 markdown 清單(`- `)——
 * 那會讓緊接在後的 a/b/c 子項變成獨立段落而非巢狀,排版反而更亂。
 */

/**
 * Info: (20260811 - Emily) 對照表只收**確定**的對應,不猜。
 * 鍵是 Word 寫出來的私有區碼位,值是意義相同的標準 Unicode。
 * 沒列進來的私有區字元維持原樣 —— 猜錯一個符號比留一個方框糟:
 * 方框看得出是壞的,猜錯的符號看起來是對的。
 */
export const OFFICE_SYMBOL_REPLACEMENTS: Readonly<Record<string, string>> = {
  "": "●", // Wingdings l：實心圓（本次 UAT 出現 57 次）
  "": "■", // Wingdings n：實心方
  "": "◆", // Wingdings u：實心菱形
  "": "▪", // Wingdings §：小實心方
  "": "□", // Wingdings ¨：空心方
  "": "•", // Symbol ·：圓點（Word 最常見的項目符號）
  "": "➢", // Wingdings Ø：右箭頭
  "": "✓", // Wingdings ü：勾
  "": "☑", // Wingdings þ：打勾方框
};

const PRIVATE_USE = /[-]/g;

/** Info: (20260811 - Emily) 換掉認得的私有區符號;認不出的原樣留著(見上方理由) */
export const replaceOfficeSymbolChars = (text: string): string => {
  if (!PRIVATE_USE.test(text)) return text;
  PRIVATE_USE.lastIndex = 0;
  return text.replace(
    PRIVATE_USE,
    (char) => OFFICE_SYMBOL_REPLACEMENTS[char] ?? char,
  );
};

/**
 * Info: (20260811 - Emily) 還留在文字裡、換不掉的私有區字元。
 * 給匯入端記 log 用:每一個都會在報告上是一個方框,必須看得見而不是靜默通過。
 */
export const unmappedPrivateUseChars = (text: string): string[] => {
  PRIVATE_USE.lastIndex = 0;
  const found = text.match(PRIVATE_USE) ?? [];
  return [
    ...new Set(
      found.filter((char) => OFFICE_SYMBOL_REPLACEMENTS[char] === undefined),
    ),
  ];
};
