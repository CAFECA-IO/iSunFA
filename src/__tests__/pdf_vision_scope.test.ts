/**
 * Info: (20260814 - Emily) 逐章切片時範圍外的影像要一起裁掉（issue 25 的後續）。
 *
 * 素材是 2026-08-14 實測的真實形狀：影像頁 [6, 7, 8]，而 14 次逐章呼叫的
 * 頁碼範圍從 {3,12} 到 {59,64} —— 只有前幾次真的涵蓋那三頁。
 */
import { describe, it, expect } from "@jest/globals";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { narrowVisionPagesToRange } from "@/lib/utils/pdf_vision_scope";

const PAGES = [6, 7, 8] as const;

/** Info: (20260814 - Emily) 造一份「只含 p6/p7/p8」的小 PDF，每頁印得出自己是誰 */
const buildVisionPages = async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  PAGES.forEach((page) => {
    doc
      .addPage([595, 842])
      .drawText(`source page ${page}`, { x: 50, y: 800, size: 12, font });
  });
  return {
    data: Buffer.from(await doc.save()).toString("base64"),
    mimeType: "application/pdf",
    pages: [...PAGES],
  };
};

const pageTexts = async (base64: string): Promise<number> => {
  const doc = await PDFDocument.load(Buffer.from(base64, "base64"));
  return doc.getPageCount();
};

describe("narrowVisionPagesToRange", () => {
  it("should keep every page when the scope covers all of them", async () => {
    // Info: (20260814 - Emily) 實測第一次呼叫的範圍就是 {from:3,to:12}
    const vision = await buildVisionPages();

    const result = await narrowVisionPagesToRange(vision, { from: 3, to: 12 });

    expect(result.decision).toBe("kept");
    expect(result.visionPages).toBe(vision);
  });

  it("should drop everything when the scope covers none of them", async () => {
    // Info: (20260814 - Emily) 實測 {from:37,to:48} 那次仍然附了 p6/p7/p8
    const vision = await buildVisionPages();

    const result = await narrowVisionPagesToRange(vision, { from: 37, to: 48 });

    expect(result.decision).toBe("dropped");
    expect(result.visionPages).toBeNull();
    // Info: (20260814 - Emily) 裁切前的頁碼要留著供 log 對照
    expect(result.had).toEqual([6, 7, 8]);
  });

  it("should reslice the pdf when only some pages are in scope", async () => {
    const vision = await buildVisionPages();

    const result = await narrowVisionPagesToRange(vision, { from: 8, to: 20 });

    expect(result.decision).toBe("narrowed");
    expect(result.visionPages?.pages).toEqual([8]);
    // Info: (20260814 - Emily) 光過濾頁碼清單不夠 —— 附帶的 PDF 本身也要只剩那一頁，
    // 否則模型會收到一張沒有被提及的圖，那比提到範圍外的頁更糟
    expect(await pageTexts(result.visionPages!.data)).toBe(1);
  });

  it("should reslice to a contiguous subset and keep the page order", async () => {
    const vision = await buildVisionPages();

    const result = await narrowVisionPagesToRange(vision, { from: 7, to: 20 });

    expect(result.decision).toBe("narrowed");
    expect(result.visionPages?.pages).toEqual([7, 8]);
    expect(await pageTexts(result.visionPages!.data)).toBe(2);
  });

  it("should keep everything when the slice fell back to the whole document", async () => {
    // Info: (20260814 - Emily) range 為 null 即 slicePagesForRange 的 fellBack:
    // 送的是全文，那影像也全部都在範圍內
    const vision = await buildVisionPages();

    const result = await narrowVisionPagesToRange(vision, null);

    expect(result.decision).toBe("kept");
    expect(result.visionPages).toBe(vision);
  });

  it("should preserve the mime type when reslicing", async () => {
    const vision = await buildVisionPages();

    const result = await narrowVisionPagesToRange(vision, { from: 6, to: 7 });

    expect(result.visionPages?.mimeType).toBe("application/pdf");
  });

  it("should report failed rather than throw when the pdf is unreadable", async () => {
    /**
     * Info: (20260814 - Emily) 這條釘住的是一個**契約**而不是一個行為：本支不拋。
     *
     * 25 號整段的立場是「補完整性的功能不該讓匯入失敗」。裁切是後加的一層，
     * 它若會拋，就等於替一個錦上添花的功能裝上一個能弄掉整份匯入的開關 ——
     * 而 `scopeSourceToPages` 的呼叫點不在任何 try 裡面。
     */
    const result = await narrowVisionPagesToRange(
      {
        data: Buffer.from("not a pdf at all").toString("base64"),
        mimeType: "application/pdf",
        pages: [6, 7, 8],
      },
      { from: 8, to: 20 },
    );

    expect(result.decision).toBe("failed");
    expect(result.visionPages).toBeNull();
    // Info: (20260814 - Emily) failed 與 dropped 要分得開:前者是「該附圖但裁不動」
    expect(result.had).toEqual([6, 7, 8]);
  });

  it("should not mutate the input", async () => {
    const vision = await buildVisionPages();
    const before = JSON.stringify(vision);

    await narrowVisionPagesToRange(vision, { from: 8, to: 20 });

    expect(JSON.stringify(vision)).toBe(before);
  });
});
