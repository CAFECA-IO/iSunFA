/**
 * Info: (20260814 - Emily) 抽頁（issue 25）。
 * 只有那幾頁該進去，而且圖要原樣還在 —— 抽頁若把圖丟了，這整條路就沒有意義。
 */
import { describe, it, expect } from "@jest/globals";
import {
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  StandardFonts,
} from "pdf-lib";
import { deflateSync } from "zlib";
import { extractPagesAsPdf } from "@/lib/utils/pdf_page_extract";

const buildFixture = async (): Promise<Buffer> => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  // Info: (20260814 - Emily) 5 頁，第 2、4 頁各嵌一張大圖
  for (let index = 1; index <= 5; index += 1) {
    const page = doc.addPage([595, 842]);
    page.drawText(`page ${index}`, { x: 50, y: 800, size: 12, font });
    if (index === 2 || index === 4) {
      const png = await doc.embedPng(BIG_PNG);
      page.drawImage(png, { x: 50, y: 100, width: 495, height: 668 });
    }
  }
  return Buffer.from(await doc.save());
};

/**
 * Info: (20260814 - Emily) 1050x1417 的最小 PNG（與高興昌那張組織架構圖同尺寸）。
 * 用程式產而不是放二進位檔:測試資料要看得懂,而尺寸正是這裡唯一重要的事。
 */
const BIG_PNG = (() => {
  const width = 1050;
  const height = 1417;
  const raw = Buffer.alloc((width * 3 + 1) * height, 0xff);
  for (let y = 0; y < height; y += 1) raw[y * (width * 3 + 1)] = 0;
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  };
  const crcTable = Array.from({ length: 256 }, (unused, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i += 1)
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
})();

describe("extractPagesAsPdf", () => {
  it("should keep only the requested pages", async () => {
    const result = await extractPagesAsPdf(await buildFixture(), [2, 4]);

    expect(result).not.toBeNull();
    expect(result?.extracted).toEqual([2, 4]);
    const out = await PDFDocument.load(result!.bytes);
    expect(out.getPageCount()).toBe(2);
  });

  /**
   * Info: (20260814 - Emily) 圖必須還在 —— 抽頁若把嵌入資源丟了，
   * 送過去的就是一張白紙，而且看起來一切正常。
   *
   * 用 pdf-lib 查頁面資源字典裡的 XObject，不量體積也不用 pdf-parse：
   * - 體積分不出來：全白的 1050x1417 PNG 壓縮後只有 5KB
   * - pdf-parse 在 jest 裡跑不起來（pdfjs 的動態 import 需要
   *   `--experimental-vm-modules`）—— 這也是 `pdf_text_layer.ts` 那些
   *   薄 IO 包裝一律沒有單元測試的原因，判定邏輯才會被刻意抽成純函式。
   */
  const imageCountOnFirstPage = async (bytes: Uint8Array): Promise<number> => {
    const out = await PDFDocument.load(bytes);
    const resources = out.getPage(0).node.Resources();
    const xObjects = resources?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (!xObjects) return 0;
    return xObjects
      .entries()
      .filter(([, value]) =>
        (out.context.lookup(value) as PDFRawStream | undefined)?.dict
          ?.get(PDFName.of("Subtype"))
          ?.toString()
          .includes("Image"),
      ).length;
  };

  it("should carry the embedded image across", async () => {
    const result = await extractPagesAsPdf(await buildFixture(), [2]);

    expect(await imageCountOnFirstPage(result!.bytes)).toBe(1);
  });

  // Info: (20260814 - Emily) 純文字頁抽出來就該沒有圖（判準不會憑空生圖）
  it("should not carry an image for a text-only page", async () => {
    const result = await extractPagesAsPdf(await buildFixture(), [1]);

    expect(await imageCountOnFirstPage(result!.bytes)).toBe(0);
  });

  it("should be much smaller than the whole document", async () => {
    const source = await buildFixture();
    const result = await extractPagesAsPdf(source, [2]);

    expect(Buffer.from(result!.bytes).length).toBeLessThan(source.length);
  });

  // Info: (20260814 - Emily) 頁碼重複不得讓同一頁被送兩次
  it("should de-duplicate page numbers", async () => {
    const result = await extractPagesAsPdf(await buildFixture(), [2, 2, 4]);

    expect(result?.extracted).toEqual([2, 4]);
  });

  it("should sort the pages", async () => {
    const result = await extractPagesAsPdf(await buildFixture(), [4, 2]);

    expect(result?.extracted).toEqual([2, 4]);
  });

  /**
   * Info: (20260814 - Emily) 超出範圍的頁碼忽略而不是拋錯：
   * 少看一頁是可接受的降級，讓整個匯入失敗不是。
   */
  it("should ignore out-of-range page numbers", async () => {
    const result = await extractPagesAsPdf(
      await buildFixture(),
      [2, 99, 0, -1],
    );

    expect(result?.extracted).toEqual([2]);
  });

  it("should return null when nothing is left to extract", async () => {
    expect(await extractPagesAsPdf(await buildFixture(), [])).toBeNull();
    expect(await extractPagesAsPdf(await buildFixture(), [99])).toBeNull();
  });
});
