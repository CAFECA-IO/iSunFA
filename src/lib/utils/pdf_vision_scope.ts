/**
 * Info: (20260814 - Emily) 逐章切片時，範圍外的頁面影像要一起裁掉
 * (`data/issue_drafts/open/25_image_only_sections.md` 的後續)。
 *
 * ## 為什麼需要
 *
 * `scopeSourceToPages` 原本只裁文字：`return { ...source, data: slice.text }`
 * —— `visionPages` 原封不動被帶過去。而一份 64 頁的報告要 14 次逐章呼叫，
 * 於是同一份 p6/p7/p8 的影像 PDF **被送了 14 次**，包括文字範圍是 p38–47 的那一次。
 *
 * 2026-08-14 實測 log：15 次 LLM 呼叫、input 約 41 萬 token，
 * 而每一次的 `source decision (cached)` 都印著 `visionPages:[6,7,8]`。
 *
 * 三個後果，成本只是最輕的那個：
 *
 * 1. **成本**：同一份 base64 影像重送 13 次
 * 2. **干擾**：`buildImagePagesInstruction` 會對模型說「另附原文第 6、7、8 頁的頁面影像」，
 *    而這次要處理的文字是 p38–47 —— 那是一句與範圍矛盾的指示
 * 3. **無效**：真正需要看圖的只有 p6/p7/p8 所在的那一兩次呼叫
 *
 * 同一趟實測，活動數據抽取兩次都是 `received:0, accepted:0`，而影像頁確認已送到。
 * 是否為因果還沒有證據 —— 但「範圍外的影像不該送」本身就成立，不需要等因果確認。
 *
 * ## 為什麼要重切那份小 PDF 而不是只過濾頁碼清單
 *
 * `visionPages.data` 是一份**只含那幾頁**的 PDF。如果只過濾 `pages` 而不動 `data`，
 * 模型會收到一張沒有被提及的圖 —— 那比「提到範圍外的頁」更糟：
 * 前者至少說了實話，後者是**默默多送一頁**。
 *
 * 重切是無損的（`extractPagesAsPdf` 用 pdf-lib 複製頁面），而且不需要原始檔 ——
 * 小 PDF 自己就是輸入。
 *
 * ## 判準：一頁都不在範圍內就整包丟掉，並記 log
 *
 * 丟掉不是靜默的降級：呼叫端會記一行，說明這次為什麼沒有附圖。
 * 少了那行 log，「這一章不需要看圖」與「裁切裁錯了」在現場分不出來 ——
 * 與 `source decision (cached)` 補印 `visionPages` 同一個判準
 * (`data/issue_drafts/open/29_source_decision_cache_vision_pages.md`)。
 */

import { extractPagesAsPdf } from "@/lib/utils/pdf_page_extract";

/** Info: (20260814 - Emily) 與 `IReportImportSource.visionPages` 同形 */
export interface IVisionPages {
  readonly data: string;
  readonly mimeType: string;
  readonly pages: readonly number[];
}

export type VisionScopeDecision =
  /** Info: (20260814 - Emily) 全部都在範圍內，原樣沿用（不重切，省一次 pdf-lib） */
  | "kept"
  /** Info: (20260814 - Emily) 部分在範圍內，已重切成子集 */
  | "narrowed"
  /** Info: (20260814 - Emily) 一頁都不在範圍內 */
  | "dropped"
  /** Info: (20260814 - Emily) 重切失敗（小 PDF 讀不開）—— 寧可不附圖，也不附錯的圖 */
  | "failed";

export interface IVisionScopeResult {
  readonly visionPages: IVisionPages | null;
  readonly decision: VisionScopeDecision;
  /** Info: (20260814 - Emily) 裁切前的頁碼，供 log 對照 */
  readonly had: readonly number[];
}

/**
 * Info: (20260814 - Emily) 把附帶的頁面影像裁到這次的頁碼範圍內。
 *
 * `range` 為 null 代表切片退回送全文（`slicePagesForRange` 的 `fellBack`）——
 * 那時整份文字都在範圍內，影像也就全部都在，原樣沿用。
 *
 * ## 本支不拋例外，這是刻意的契約
 *
 * 25 號那條路整段的立場是「補完整性的功能不該讓匯入失敗」
 * （`resolveSource` 拿不到圖片資訊時維持純文字、不拋）。裁切是在那之後才加的一層 ——
 * 若它會拋，就等於替一個錦上添花的功能裝上一個能弄掉整份匯入的開關，
 * 而 `scopeSourceToPages` 的呼叫點不在任何 try 裡面。
 *
 * 所以 pdf-lib 讀不開時回 `failed`：這次不附圖、呼叫端記一行，匯入照跑。
 * `failed` 與 `dropped` 是兩個值而不是一個，因為那是兩件事 ——
 * 「這一章不需要看圖」與「該附圖但裁不動」，混在一起的話現場分不出來。
 */
export const narrowVisionPagesToRange = async (
  visionPages: IVisionPages,
  range: { readonly from: number; readonly to: number } | null,
): Promise<IVisionScopeResult> => {
  const had = visionPages.pages;
  if (range === null) return { visionPages, decision: "kept", had };

  const inRange = had.filter((page) => page >= range.from && page <= range.to);
  if (inRange.length === had.length) {
    return { visionPages, decision: "kept", had };
  }
  if (inRange.length === 0) {
    return { visionPages: null, decision: "dropped", had };
  }

  /**
   * Info: (20260814 - Emily) 小 PDF 的第 k 頁對應 `pages[k - 1]`。
   *
   * 這個對應成立的前提是 `extractPagesAsPdf` 產出時已經**排序去重**，
   * 而回傳的 `extracted` 就是那份順序（見該檔）。
   * 所以這裡拿位置去切，再用位置換回絕對頁碼。
   */
  const positions = inRange.map((page) => had.indexOf(page) + 1);
  const resliced = await extractPagesAsPdf(
    Buffer.from(visionPages.data, "base64"),
    positions,
  ).catch(() => null);
  if (resliced === null) {
    return { visionPages: null, decision: "failed", had };
  }

  return {
    visionPages: {
      data: Buffer.from(resliced.bytes).toString("base64"),
      mimeType: visionPages.mimeType,
      pages: resliced.extracted.map((position) => had[position - 1]),
    },
    decision: "narrowed",
    had,
  };
};
