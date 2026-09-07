/**
 * Info: (20260814 - Emily) 「內容只住在圖片裡」的頁面挑選（issue 25）。
 *
 * 這一組釘的是**判準本身**：用「有大圖」而不是「文字少」。
 * 樣本取自高興昌那份 64 頁報告的實測值 —— p6 正文 0 字元 + 1 張 1417px 高的圖，
 * p7 146 字元 + 2 張大圖，p8 369 字元 + 1 張大圖，
 * 而純文字頁的字元數最低到 57。
 */
import { describe, it, expect } from "@jest/globals";
import {
  selectImageOnlyPages,
  type IPdfPageImagery,
} from "@/lib/utils/pdf_page_imagery";

const MIN_LONG_EDGE = 600;
const MAX_PAGES = 8;

const page = (
  no: number,
  chars: number,
  ...images: Array<[number, number]>
): IPdfPageImagery => ({
  page: no,
  chars,
  images: images.map(([widthPx, heightPx]) => ({ widthPx, heightPx })),
});

const select = (pages: IPdfPageImagery[]) =>
  selectImageOnlyPages({
    pages,
    minLongEdgePx: MIN_LONG_EDGE,
    maxPages: MAX_PAGES,
  });

describe("selectImageOnlyPages", () => {
  /**
   * Info: (20260814 - Emily) 高興昌那份的實際形狀：64 頁裡只有 p6/p7/p8 符合。
   * 這是這張票的驗收條件本身。
   */
  it("should pick exactly the three pages whose content lives in images", () => {
    const pages = [
      page(1, 720),
      page(5, 616),
      page(6, 0, [1050, 1417]),
      page(7, 146, [980, 720], [980, 700]),
      page(8, 369, [1200, 860]),
      page(9, 57),
      page(10, 830),
    ];

    const result = select(pages);

    expect(result.pages).toEqual([6, 7, 8]);
    expect(result.matchedCount).toBe(3);
    expect(result.exceededLimit).toBe(false);
  });

  /**
   * Info: (20260814 - Emily) **這條是判準的核心。**
   *
   * 純文字頁的字元數最低到 57，而 p8 有 369 字元 —— 用「文字少」當判準的話
   * 會挑到 57 字那頁（它沒有圖，挑了也沒用）而漏掉 369 字那頁（內容真的在圖裡）。
   */
  it("should not use text volume as the signal", () => {
    const sparseNoImage = page(9, 57);
    const wordyWithImage = page(8, 369, [1200, 860]);

    const result = select([sparseNoImage, wordyWithImage]);

    expect(result.pages).toEqual([8]);
  });

  // Info: (20260814 - Emily) 小圖（logo、圖示）不算 —— 否則整份每頁都命中
  it("should ignore images below the threshold", () => {
    const result = select([page(3, 800, [120, 48], [200, 200])]);

    expect(result.pages).toEqual([]);
    expect(result.matchedCount).toBe(0);
  });

  // Info: (20260814 - Emily) 長邊達標即可：橫式地圖與直式架構圖都要收得到
  it("should measure the long edge, whichever side it is", () => {
    const landscape = page(4, 100, [1400, 300]);
    const portrait = page(5, 100, [300, 1400]);

    expect(select([landscape, portrait]).pages).toEqual([4, 5]);
  });

  /**
   * Info: (20260814 - Emily) 命中數超過上限時**一頁都不挑**，並把命中數說出來。
   *
   * 那代表整份是圖片型文件，該由 assessPdfTextLayer 判成 VISION 走整份 ——
   * 挑 40 頁各送一次比整份送還貴，而且拼不回完整上下文。
   * 挑一半更糟：漏掉的一樣是靜默缺內容，而且「有送過視覺模型」會讓人以為圖都看過了。
   */
  it("should select nothing when too many pages match, and say how many did", () => {
    const pages = Array.from({ length: MAX_PAGES + 1 }, (unused, index) =>
      page(index + 1, 100, [900, 1200]),
    );

    const result = select(pages);

    expect(result.pages).toEqual([]);
    expect(result.matchedCount).toBe(MAX_PAGES + 1);
    expect(result.exceededLimit).toBe(true);
  });

  // Info: (20260814 - Emily) 正好等於上限要挑（邊界；上限是「最多幾頁」不是「少於幾頁」）
  it("should still select when the count equals the limit", () => {
    const pages = Array.from({ length: MAX_PAGES }, (unused, index) =>
      page(index + 1, 100, [900, 1200]),
    );

    expect(select(pages).pages).toHaveLength(MAX_PAGES);
    expect(select(pages).exceededLimit).toBe(false);
  });

  /**
   * Info: (20260814 - Emily) 「沒有任何頁含大圖」與「命中太多所以放棄」都回空陣列，
   * 但 matchedCount 分得開 —— 呼叫端記 log 時那是兩件完全不同的事實。
   */
  it("should distinguish no matches from too many matches", () => {
    const none = select([page(1, 800)]);

    expect(none.pages).toEqual([]);
    expect(none.matchedCount).toBe(0);
    expect(none.exceededLimit).toBe(false);
  });

  it("should return pages in ascending order regardless of input order", () => {
    const result = select([
      page(8, 0, [900, 1200]),
      page(3, 0, [900, 1200]),
      page(6, 0, [900, 1200]),
    ]);

    expect(result.pages).toEqual([3, 6, 8]);
  });

  it("should handle a document with no pages", () => {
    expect(select([])).toEqual({
      pages: [],
      matchedCount: 0,
      exceededLimit: false,
    });
  });
});
