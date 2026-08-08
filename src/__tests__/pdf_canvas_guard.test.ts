/**
 * Info: (20260807 - Emily) PDF 光柵化尺寸預算與空白偵測
 * (issue_drafts/inventory_table_import/10_report_pdf_all_blank.md)。
 *
 * 這一組測試存在的理由很具體:153 頁的空白 PDF 是**下載成功**的。
 * 「輸出成功」與「輸出正確」在畫面上同形,唯一能分辨兩者的地方就在這裡。
 */

import { describe, it, expect } from "@jest/globals";
import { PDF_BLANK_PROBE_SIZE_PX } from "@/constants/pdf_export";
import {
  assessCanvasBudget,
  computePageStarts,
  isCanvasBlank,
  maxPagesPerSegment,
} from "@/lib/utils/pdf_canvas_guard";
import {
  PDF_CANVAS_MAX_DIMENSION_PX,
  PDF_EXPORT_SCALE,
  PDF_SEGMENT_MAX_PAGES,
} from "@/constants/pdf_export";

// Info: (20260807 - Emily) 96dpi 下 A4 的內容高度,與 issue 中的推算同一組數字
const A4_CONTENT_HEIGHT_PX = 1123;
const A4_CONTENT_WIDTH_PX = 794;

describe("assessCanvasBudget", () => {
  it("should accept a short document (the common case must not change behaviour)", () => {
    const verdict = assessCanvasBudget({
      widthPx: A4_CONTENT_WIDTH_PX,
      heightPx: A4_CONTENT_HEIGHT_PX * 12,
      scale: PDF_EXPORT_SCALE,
    });
    expect(verdict.withinBudget).toBe(true);
  });

  it("should reject the 153-page report that produced blank output", () => {
    const verdict = assessCanvasBudget({
      widthPx: A4_CONTENT_WIDTH_PX,
      heightPx: A4_CONTENT_HEIGHT_PX * 153,
      scale: PDF_EXPORT_SCALE,
    });
    expect(verdict.withinBudget).toBe(false);
    // Info: (20260807 - Emily) 推算高度必須遠超單邊上限 —— 這正是靜默空白的成因
    expect(verdict.projectedHeightPx).toBeGreaterThan(
      PDF_CANVAS_MAX_DIMENSION_PX,
    );
  });

  it("should reject zero-sized content instead of reporting it as printable", () => {
    expect(
      assessCanvasBudget({ widthPx: 0, heightPx: 0, scale: PDF_EXPORT_SCALE })
        .withinBudget,
    ).toBe(false);
  });

  it("should reject on area even when both edges are under the dimension cap", () => {
    // Info: (20260807 - Emily) 20000 × 20000 = 4 億 px²,單邊都在 65535 以下但面積超限
    expect(
      assessCanvasBudget({ widthPx: 20000, heightPx: 20000, scale: 1 })
        .withinBudget,
    ).toBe(false);
  });
});

/**
 * Info: (20260807 - Emily) 「量不到」與「太大」必須分得開
 * (UAT:編輯模式下按下載,元素被 display:none 藏著,量到 0x0)。
 */
describe("assessCanvasBudget 的空內容判定", () => {
  it("should flag a zero-sized element as empty, not as over budget", () => {
    const verdict = assessCanvasBudget({ widthPx: 0, heightPx: 0, scale: 2 });
    expect(verdict.isEmpty).toBe(true);
  });

  it("should flag a zero-height element as empty even when width is fine", () => {
    expect(
      assessCanvasBudget({ widthPx: 794, heightPx: 0, scale: 2 }).isEmpty,
    ).toBe(true);
  });

  it("should not call an oversized element empty (it has plenty to draw)", () => {
    const verdict = assessCanvasBudget({
      widthPx: 794,
      heightPx: 200000,
      scale: 2,
    });
    expect(verdict.isEmpty).toBe(false);
    expect(verdict.withinBudget).toBe(false);
  });

  it("should not call a normal element empty", () => {
    expect(
      assessCanvasBudget({ widthPx: 794, heightPx: 1123, scale: 2 }).isEmpty,
    ).toBe(false);
  });
});

describe("maxPagesPerSegment", () => {
  it("should keep every segment inside the safe budget", () => {
    const pages = maxPagesPerSegment(
      A4_CONTENT_HEIGHT_PX,
      A4_CONTENT_WIDTH_PX,
      PDF_EXPORT_SCALE,
      PDF_SEGMENT_MAX_PAGES,
    );
    expect(pages).toBeGreaterThan(0);
    expect(pages).toBeLessThanOrEqual(PDF_SEGMENT_MAX_PAGES);
    expect(
      assessCanvasBudget({
        widthPx: A4_CONTENT_WIDTH_PX,
        heightPx: A4_CONTENT_HEIGHT_PX * pages,
        scale: PDF_EXPORT_SCALE,
      }).withinBudget,
    ).toBe(true);
  });

  it("should never return 0 (a 0 would make the segment loop spin forever)", () => {
    // Info: (20260807 - Emily) 單頁就已經超出預算的極端輸入:回 1 讓呼叫端以明確錯誤收尾
    expect(maxPagesPerSegment(90000, 40000, 4, PDF_SEGMENT_MAX_PAGES)).toBe(1);
    expect(maxPagesPerSegment(0, 800, 2, PDF_SEGMENT_MAX_PAGES)).toBe(1);
  });
});

/**
 * Info: (20260807 - Emily) node 測試環境沒有真的 canvas,故以注入的探針替身驗證判定邏輯。
 * `isCanvasBlank` 的 createProbe 參數就是為了這件事而存在。
 *
 * 探針會記錄自己被 drawImage 了幾次 —— 逐次減半是這支函式的正確性關鍵,
 * 不是實作細節:一次縮到位會讓瀏覽器走近似最鄰近取樣,細內容整條被跳過。
 */
const buildProbe = (pixels: number[], calls?: { drawImage: number }) =>
  ({
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: () => {
        if (calls) calls.drawImage += 1;
      },
      getImageData: () => ({ data: Uint8ClampedArray.from(pixels) }),
      imageSmoothingEnabled: false,
    }),
  }) as unknown as HTMLCanvasElement;

const PROBE_PIXELS = PDF_BLANK_PROBE_SIZE_PX * PDF_BLANK_PROBE_SIZE_PX;

const uniformPixels = (count: number): number[] =>
  Array.from({ length: count * 4 }, () => 255);

/**
 * Info: (20260807 - Emily) 在整片同色的探針上點出 n 個異色像素。
 *
 * 刻意從索引 100 開始而不是 0:判定基準取的就是左上角那個像素,
 * 把它染黑等於把「背景色」定義成黑,其餘白像素會全部被算成有內容。
 * (實作上這個方向是安全的 —— 會判成「有內容」而不是「空白」,
 *  不會讓空白輸出溜過去,但測試若踩到就量不到想量的東西。)
 */
const INK_OFFSET = 100;

const withInk = (count: number, inked: number): number[] => {
  const pixels = uniformPixels(count);
  for (let p = 0; p < inked; p += 1) {
    const at = INK_OFFSET + p;
    pixels[at * 4] = 0;
    pixels[at * 4 + 1] = 0;
    pixels[at * 4 + 2] = 0;
  }
  return pixels;
};

describe("isCanvasBlank", () => {
  it("should treat a zero-sized canvas as blank", () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    expect(
      isCanvasBlank(canvas, () => buildProbe(uniformPixels(PROBE_PIXELS))),
    ).toBe(true);
  });

  it("should treat a uniform canvas as blank (white or dark, both are empty)", () => {
    const canvas = { width: 1588, height: 2246 } as HTMLCanvasElement;
    expect(
      isCanvasBlank(canvas, () => buildProbe(uniformPixels(PROBE_PIXELS))),
    ).toBe(true);
    // Info: (20260807 - Emily) 深色版面的空白頁不是白的,但仍然是整片同色
    const dark = Array.from({ length: PROBE_PIXELS * 4 }, (_, i) =>
      i % 4 === 3 ? 255 : 17,
    );
    expect(isCanvasBlank(canvas, () => buildProbe(dark))).toBe(true);
  });

  it("should treat a canvas with content as not blank", () => {
    const canvas = { width: 1588, height: 2246 } as HTMLCanvasElement;
    expect(
      isCanvasBlank(canvas, () =>
        buildProbe(withInk(PROBE_PIXELS, Math.floor(PROBE_PIXELS * 0.1))),
      ),
    ).toBe(false);
  });

  /**
   * Info: (20260807 - Emily) 本次修正真正要防的回歸
   * (issue_drafts/inventory_table_import/10_report_pdf_all_blank.md)。
   *
   * 一張只有頁碼或一行標題的 A4 是**合法**輸出,不是空白。
   * 實測 128×128 探針下,只有右下角頁碼的頁面量到 9 個非背景像素、
   * 單一 8px 圖示量到 4 個 —— 舊的比例門檻(0.002,即 32 個像素)
   * 會把兩者都判成空白並中止整份輸出,把護欄變成故障源。
   */
  it("should not flag a sparse but legitimate page as blank", () => {
    const canvas = { width: 1588, height: 2246 } as HTMLCanvasElement;
    for (const inked of [3, 4, 9]) {
      expect(
        isCanvasBlank(canvas, () => buildProbe(withInk(PROBE_PIXELS, inked))),
      ).toBe(false);
    }
  });

  it("should treat a canvas with fewer ink pixels than the floor as blank", () => {
    const canvas = { width: 1588, height: 2246 } as HTMLCanvasElement;
    for (const inked of [0, 1, 2]) {
      expect(
        isCanvasBlank(canvas, () => buildProbe(withInk(PROBE_PIXELS, inked))),
      ).toBe(true);
    }
  });

  /**
   * Info: (20260807 - Emily) 逐次減半必須真的發生。
   * 1588×2246 縮到 128 需要多步;若實作退回「一次縮到位」,
   * drawImage 只會被呼叫一次 —— 那正是會讓細內容消失的寫法。
   */
  it("should downscale in multiple steps rather than one jump", () => {
    const calls = { drawImage: 0 };
    const canvas = { width: 1588, height: 2246 } as HTMLCanvasElement;
    isCanvasBlank(canvas, () => buildProbe(uniformPixels(PROBE_PIXELS), calls));
    expect(calls.drawImage).toBeGreaterThan(1);
  });

  it("should not block output when the probe context is unavailable", () => {
    /**
     * Info: (20260807 - Emily) 偵測手段失效時不得回 true。
     * 把「無法檢查」變成「檢查出問題」會用偵測本身的故障擋掉正常輸出,
     * 那比漏報更糟。
     */
    const probe = {
      width: 0,
      height: 0,
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    const canvas = { width: 800, height: 600 } as HTMLCanvasElement;
    expect(isCanvasBlank(canvas, () => probe)).toBe(false);
  });
});

/**
 * Info: (20260807 - Emily) 分頁線避開圖表
 * (issue_drafts/inventory_table_import/10,UAT:「圖表多處被截斷」)。
 */
describe("computePageStarts", () => {
  const PAGE = 1000;

  it("should keep uniform page starts when nothing straddles a boundary", () => {
    expect(computePageStarts(3500, PAGE, [])).toEqual([0, 1000, 2000, 3000]);
  });

  it("should pull the boundary up so a chart is not split", () => {
    // Info: (20260807 - Emily) 圖表 900–1300 會被 1000 這條分頁線穿過
    const starts = computePageStarts(2500, PAGE, [
      { topPx: 900, bottomPx: 1300 },
    ]);
    expect(starts[1]).toBe(900);
    // Info: (20260807 - Emily) 整張圖落在第二頁內(900 起,第二頁到 1900)
    expect(starts[2]).toBeGreaterThanOrEqual(1300);
  });

  it("should not pull up when doing so would leave the page nearly empty", () => {
    /**
     * Info: (20260807 - Emily) 圖表 200–1200:提前分頁只會用掉 200/1000 = 20%,
     * 低於 35% 的下限。寧可切開這一張,也不要換來一頁幾乎全白。
     */
    const starts = computePageStarts(2500, PAGE, [
      { topPx: 200, bottomPx: 1200 },
    ]);
    expect(starts[1]).toBe(1000);
  });

  it("should not try to rescue a block taller than one page", () => {
    // Info: (20260807 - Emily) 2400 高的區塊在哪一頁都會被切,提前分頁沒有意義
    const starts = computePageStarts(4000, PAGE, [
      { topPx: 500, bottomPx: 2900 },
    ]);
    expect(starts).toEqual([0, 1000, 2000, 3000]);
  });

  it("should always advance (a boundary at the cursor would spin forever)", () => {
    const starts = computePageStarts(5000, PAGE, [
      { topPx: 0, bottomPx: 1500 },
      { topPx: 1000, bottomPx: 2500 },
    ]);
    starts.forEach((value, index) => {
      if (index > 0) expect(value).toBeGreaterThan(starts[index - 1]);
    });
  });

  it("should cover the whole content without gaps", () => {
    const starts = computePageStarts(5000, PAGE, [
      { topPx: 1800, bottomPx: 2200 },
      { topPx: 3900, bottomPx: 4300 },
    ]);
    expect(starts[0]).toBe(0);
    expect(starts[starts.length - 1]).toBeLessThan(5000);
    starts.forEach((value, index) => {
      if (index > 0) {
        // Info: (20260807 - Emily) 每一頁都不得超過一頁的高度,否則貼圖會截掉底部
        expect(value - starts[index - 1]).toBeLessThanOrEqual(PAGE);
      }
    });
  });

  it("should degrade to a single page on nonsense input", () => {
    expect(computePageStarts(0, PAGE, [])).toEqual([0]);
    expect(computePageStarts(1000, 0, [])).toEqual([0]);
  });
});
