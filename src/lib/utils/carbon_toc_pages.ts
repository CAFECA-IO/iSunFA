/**
 * Info: (20260812 - Emily) 判定「目錄自己佔了文件前面幾頁」。
 *
 * 為什麼需要:目錄頁本身就列著全部的標題,所以「第一個包含這個標題的頁」
 * 永遠是目錄自己 —— 不跳過的話產出的是一份每條都指向目錄的目錄。
 *
 * 為什麼抽成純函式:這個判定錯的兩個方向都不會拋錯 ——
 * 少跳一頁,每條頁碼都指向目錄;多跳一頁,那幾頁上的標題拿到錯的頁碼
 * (而錯的頁碼比留白更糟,查證的人會照著它翻到錯的一頁)。
 * 只有測試看得見,所以它不能住在需要 Chrome 才能跑的服務裡。
 */

/**
 * Info: (20260812 - Emily) 比對前先 NFKC 再去空白。
 *
 * 去空白是因為文字層會在中文之間插入換行與空格;NFKC 是因為抽出來的字
 * 不一定是同一個碼位:實測「第一章」的「一」抽出來是 U+2F00(康熙部首),
 * 不是 U+4E00,字面看起來一樣但字串不相等。
 */
export const squeezeForTocMatch = (value: string): string =>
  value.normalize("NFKC").replace(/\s+/g, "");

export interface ICountLeadingTocPagesInput {
  /** Info: (20260812 - Emily) 逐頁文字,已經過 squeezeForTocMatch */
  readonly squeezedPages: readonly string[];
  /** Info: (20260812 - Emily) 目錄標題(例如「目錄」),已 squeeze;取不到時傳空字串 */
  readonly squeezedTocTitle: string;
  /** Info: (20260812 - Emily) 全部目錄條目的文字,已 squeeze */
  readonly squeezedEntries: readonly string[];
  /** Info: (20260812 - Emily) 一頁同時出現幾個標題才算「還在目錄裡」 */
  readonly headingHits: number;
}

/**
 * Info: (20260812 - Emily) 兩個判準取聯集,因為它們各自只在一種規模下可靠。
 *
 * - **標題命中數**:目錄頁會同時出現一整批條目,內容頁通常只出現自己那一個。
 *   但條目總數本來就少於門檻的短報告永遠不成立 —— 原本只有這一個判準,
 *   於是 4 條目的報告每一條頁碼都是 1(原始症狀完整復現)。
 * - **目錄標題**:「目錄」這個字只出現在目錄的第一頁。它正好補上短報告那個洞,
 *   而多頁目錄(必然有幾十個條目)由命中數接手 —— 第二頁沒有標題但命中數足夠。
 *
 * 兩者都只在**前綴**上判斷:後面的內容頁再密也不會被誤判成目錄。
 *
 * Info: (20260812 - Emily) 標題那個判準**只在第一頁有效**。
 *
 * 它是子字串比對,而查證用的盤查報告裡「表目錄」「圖目錄」是常見的章節名 ——
 * 兩者都含「目錄」。不限頁次的話一個含那兩個字的內容頁會被算進前綴而跳掉,
 * 於是那一頁上的章節拿到後面某一頁的頁碼。這正是下方寫的「多跳一頁」那種錯:
 * 錯的頁碼比留白更糟,查證的人會照著它翻到錯的一頁。
 *
 * 限第一頁沒有代價:目錄一定是文件的第一個區塊(外殼 → 目錄 → `break-after: page`),
 * 所以真正的目錄標題必然落在第一頁;第二頁以後的目錄由命中數接手。
 *
 * 回 0 代表「不跳」。那是一個看得出來的錯(頁碼指向目錄),
 * 比拿一個壞的頁數去跳掉真正的內容頁好 —— 後者產出的是看起來合理的錯頁碼。
 */
export const countLeadingTocPages = (
  input: ICountLeadingTocPagesInput,
): number => {
  const { squeezedPages, squeezedTocTitle, squeezedEntries, headingHits } =
    input;
  const needles = squeezedEntries.filter((entry) => entry !== "");
  if (squeezedPages.length === 0 || needles.length === 0) return 0;

  const isTocPage = (text: string, page: number): boolean =>
    (page === 0 &&
      squeezedTocTitle !== "" &&
      text.includes(squeezedTocTitle)) ||
    needles.filter((needle) => text.includes(needle)).length >= headingHits;

  let count = 0;
  while (
    count < squeezedPages.length &&
    isTocPage(squeezedPages[count], count)
  ) {
    count += 1;
  }

  /**
   * Info: (20260812 - Emily) 目錄不可能佔滿整份文件。
   * 量到那種結果代表判定失效(例如整份只有目錄那幾頁有文字層),回 0 退回舊行為。
   */
  return count >= squeezedPages.length ? 0 : count;
};

export interface IAssignTocPageNumbersInput {
  /** Info: (20260812 - Emily) 逐頁文字,已經過 squeezeForTocMatch */
  readonly squeezedPages: readonly string[];
  /** Info: (20260812 - Emily) 目錄條目的文字,已 squeeze,順序即目錄順序 */
  readonly squeezedEntries: readonly string[];
  /** Info: (20260812 - Emily) 目錄自己佔的頁數(countLeadingTocPages 的結果) */
  readonly skip: number;
}

export interface IAssignedTocPageNumber {
  /** Info: (20260812 - Emily) 1-based 頁碼;找不到是 0(呼叫端留白,不猜) */
  readonly page: number;
  /**
   * Info: (20260812 - Emily) 這一條是靠退回全域搜尋才找到的 —— 文件順序被違反了。
   * 呼叫端要記 log:它代表「量到的位置與目錄順序矛盾」,而回報的頁碼可能是錯的。
   */
  readonly outOfOrder: boolean;
}

/**
 * Info: (20260812 - Emily) 把每一條目錄條目對到一個頁碼。
 *
 * ## 為什麼是純函式
 *
 * 這段原本住在 `CarbonReportPdfService.fillTocPageNumbers` 裡,而那個方法要有 Chrome
 * 才跑得起來(`page.evaluate` 取目錄、寫回頁碼)—— 於是這段判定**在沙箱與 CI 都測不到**,
 * 只有 UAT 逐頁比對才看得見。同一個方法裡的 `countLeadingTocPages` 已經抽出來了,
 * 剩這段沒抽,結果就是它的兩個 bug(同名條目、誤命中傳染)都得靠人翻 53 頁才發現。
 * 服務層現在只留 I/O:取目錄、抽文字層、寫回頁碼。
 *
 * ## 游標為什麼單調前進
 *
 * 目錄的順序就是文件的順序。不用游標的話「第一個包含這個標題的頁」對重複出現的標題文字
 * (每章都有的「小結」、三個章節各有的「排放源明細」)永遠回同一頁 ——
 * 後面那幾條都指回前面那一節。
 *
 * ## 為什麼是 `>= cursor` 而不是 `> cursor`
 *
 * 同一頁上常有好幾節開始(短的節不會各佔一頁),所以游標**必須**允許停在原地。
 * 代價是**相鄰**兩條同名條目會塌成同一頁:第一條把游標停在第 n 頁,
 * 第二條從第 n 頁找、又找到同一頁。所以只在「這一條與前一條的文字相同」時
 * 才強制往後跳一頁 —— 那是唯一必須前進的情形,其餘一律允許同頁。
 *
 * ## 為什麼找不到時要退回全域搜尋
 *
 * 純單調會讓一個誤命中往後傳染:正文的交叉引用(「如『3.4 計算細節』所述」)
 * 若出現在該節之前,游標會被推過真正的章節,之後每一條都找不到而全部留白。
 * 退回時**不推進游標**,讓錯誤留在局部,並以 `outOfOrder` 讓呼叫端記 log。
 */
export const assignTocPageNumbers = (
  input: IAssignTocPageNumbersInput,
): IAssignedTocPageNumber[] => {
  const { squeezedPages, squeezedEntries, skip } = input;
  const missing: IAssignedTocPageNumber = { page: 0, outOfOrder: false };

  let cursor = skip;
  let previous = "";
  return squeezedEntries.map((needle) => {
    if (needle === "") return missing;

    // Info: (20260812 - Emily) 只有「與前一條同名」才必須往後跳,見檔頭
    const from = needle === previous ? cursor + 1 : cursor;
    previous = needle;

    const found = squeezedPages.findIndex(
      (text, page) => page >= from && text.includes(needle),
    );
    if (found !== -1) {
      cursor = found;
      return { page: found + 1, outOfOrder: false };
    }

    const fallback = squeezedPages.findIndex(
      (text, page) => page >= skip && text.includes(needle),
    );
    if (fallback === -1) return missing;
    return { page: fallback + 1, outOfOrder: true };
  });
};
