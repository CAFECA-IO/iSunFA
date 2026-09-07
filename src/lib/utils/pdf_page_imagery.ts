/**
 * Info: (20260814 - Emily) 哪幾頁的內容「只住在圖片裡」
 * (`data/issue_drafts/open/25_image_only_sections.md`)。
 *
 * ## 這支要回答的問題，與既有閘門不同
 *
 * `assessPdfTextLayer` 問的是：**這份文件的文字層解碼得出來嗎**。
 * 那個問題問得對，也解決了它要解決的事（>14MB 的報告不再被 `VA_FILE_TOO_LARGE` 擋掉）。
 *
 * 但完整性要問的是另一個問題：**有沒有哪一節的內容只住在圖片裡**。
 *
 * 高興昌那份 64 頁的文字層很乾淨（中位數 616 字/頁），於是整份走純文字路徑 ——
 * 而 p6（`1.4 溫室氣體盤查推行委員會` 的組織架構圖）正文 0 字元、
 * p7/p8（三個廠址地圖）各 146 / 369 字元，那三頁的圖從頭到尾沒有被看過，
 * 且沒有任何 log。實測產出的報告在那一節只印了「(本節內容不足以繪製結構圖)」——
 * 護欄說的是實話，是**真的沒有節點可畫**。
 *
 * ## 判準用「有大圖」，不是「文字少」
 *
 * 那份報告純文字頁的字元數最低到 **57**，而 p8 有 369 字元 ——
 * 單看文字量，圖片頁與正常頁分不開。
 * 但 64 頁裡只有 3 頁含大尺寸嵌入圖片，這個訊號是乾淨的。
 *
 * ## 為什麼不是整份退回視覺模型
 *
 * 那條路 2026-07-30 已經被否決過：>14MB 的報告會被擋掉，token 成本也高一個量級。
 * 這裡只挑出符合的頁 —— 實測 3/64 頁，**約 5%**，成本可忽略。
 */

/** Info: (20260814 - Emily) 單頁的圖片與文字量測結果 */
export interface IPdfPageImagery {
  /** Info: (20260814 - Emily) 1-based 頁碼 */
  readonly page: number;
  /** Info: (20260814 - Emily) 該頁文字層的字元數（去空白後） */
  readonly chars: number;
  /**
   * Info: (20260814 - Emily) 該頁嵌入圖片的**內在**像素尺寸（不是排版後的尺寸）。
   * 用內在尺寸是因為排版尺寸要拿到繪製矩陣才算得出來，而內在尺寸在資源字典裡就有；
   * 兩者的差別對「這張圖大不大」這個判斷不重要 —— 沒有人會把 1400px 的圖嵌進來當圖示。
   */
  readonly images: ReadonlyArray<{
    readonly widthPx: number;
    readonly heightPx: number;
  }>;
}

export interface ISelectImagePagesInput {
  readonly pages: readonly IPdfPageImagery[];
  /** Info: (20260814 - Emily) 長邊達到幾 px 才算「大圖」 */
  readonly minLongEdgePx: number;
  /**
   * Info: (20260814 - Emily) 最多挑幾頁。超過就一頁都不挑 —— 見 `selectImageOnlyPages`。
   */
  readonly maxPages: number;
}

export interface ISelectedImagePages {
  /** Info: (20260814 - Emily) 要送視覺模型的頁碼（1-based，遞增） */
  readonly pages: number[];
  /**
   * Info: (20260814 - Emily) 命中大圖的總頁數 —— **即使因為超過上限而沒有挑**。
   * 呼叫端要記 log：「有 40 頁含大圖，所以一頁都沒挑」與「沒有任何頁含大圖」
   * 是完全不同的事實，混在一起看不出是判準失效還是文件真的沒有圖。
   */
  readonly matchedCount: number;
  /** Info: (20260814 - Emily) true = 命中數超過上限，本次放棄逐頁挑選 */
  readonly exceededLimit: boolean;
}

const hasLargeImage = (page: IPdfPageImagery, minLongEdgePx: number): boolean =>
  page.images.some(
    (image) => Math.max(image.widthPx, image.heightPx) >= minLongEdgePx,
  );

/**
 * Info: (20260814 - Emily) 挑出「含大尺寸嵌入圖片」的頁。
 *
 * ## 超過上限時一頁都不挑
 *
 * 命中數超過 `maxPages` 代表這份文件**整體就是圖片型**，而不是「有幾節的內容在圖裡」。
 * 那種文件該由既有的 `assessPdfTextLayer` 判成 VISION 走整份視覺模型，
 * 不是由這裡挑 40 頁出來各送一次 —— 那會比整份送還貴，而且拼不回完整的上下文。
 *
 * 挑一半也不行：漏掉的那些頁一樣是靜默缺內容，而且更難察覺
 * （「有送過視覺模型」會讓人以為圖都看過了）。
 * 所以要嘛全挑，要嘛不挑並讓呼叫端知道命中了幾頁。
 */
export const selectImageOnlyPages = (
  input: ISelectImagePagesInput,
): ISelectedImagePages => {
  const matched = input.pages
    .filter((page) => hasLargeImage(page, input.minLongEdgePx))
    .map((page) => page.page)
    .sort((left, right) => left - right);

  if (matched.length > input.maxPages) {
    return {
      pages: [],
      matchedCount: matched.length,
      exceededLimit: true,
    };
  }
  return { pages: matched, matchedCount: matched.length, exceededLimit: false };
};
