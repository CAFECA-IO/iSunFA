// Info: (20260731 - Tzuhan) PDF 匯出體積回歸測試。
// Info: (20260731 - Tzuhan) 這個 bug(匯出檔 > 20 MB)能長這麼久,是因為沒有任何東西在量體積。
// Info: (20260731 - Tzuhan) 因此不測「compress 這個選項有沒有被設定」——那只是覆述程式碼;
// Info: (20260731 - Tzuhan) 測的是真實 jsPDF 產出的位元組數,壓縮失效就會失敗。

import { describe, it, expect } from "@jest/globals";
import { jsPDF } from "jspdf";
import {
  buildExportFileName,
  sanitizeFileNamePart,
} from "@/lib/utils/pdf_export";
import { PDF_EXPORT_SIZE_BUDGET_BYTES } from "@/constants/logistics";

// Info: (20260731 - Tzuhan) 以純色 PNG 當測試素材:jsPDF 對影像的處理與內容無關,
// Info: (20260731 - Tzuhan) 未壓縮時一律是「寬 × 高 × 3」的原始 RGB,這正是要驗的關係。
const WIDTH = 600;
const HEIGHT = 1800;
const RAW_RGB_BYTES = WIDTH * HEIGHT * 3;

function buildSolidPng(width: number, height: number): string {
  // Info: (20260731 - Tzuhan) 手工組出最小合法 PNG(zlib stored blocks),避免測試依賴 canvas 或原生綁定
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i += 1) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Info: (20260731 - Tzuhan) bit depth
  ihdr[9] = 2; // Info: (20260731 - Tzuhan) color type 2 = truecolor RGB
  const scanline = Buffer.alloc(1 + width * 3, 0xff);
  scanline[0] = 0; // Info: (20260731 - Tzuhan) filter type none
  const rawScanlines = Buffer.concat(
    Array.from({ length: height }, () => scanline),
  );

  // Info: (20260731 - Tzuhan) zlib 容器 + stored(未壓縮)deflate 區塊:不需 zlib 依賴即可產生合法 PNG
  const blocks: Buffer[] = [];
  const MAX_BLOCK = 65535;
  for (let offset = 0; offset < rawScanlines.length; offset += MAX_BLOCK) {
    const slice = rawScanlines.subarray(offset, offset + MAX_BLOCK);
    const isLast = offset + MAX_BLOCK >= rawScanlines.length;
    const header = Buffer.alloc(5);
    header[0] = isLast ? 1 : 0;
    header.writeUInt16LE(slice.length, 1);
    header.writeUInt16LE(~slice.length & 0xffff, 3);
    blocks.push(header, slice);
  }
  let a = 1;
  let b = 0;
  for (let i = 0; i < rawScanlines.length; i += 1) {
    a = (a + rawScanlines[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE(((b << 16) | a) >>> 0);
  const idat = Buffer.concat([Buffer.from([0x78, 0x01]), ...blocks, adler]);

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

const buildPdf = (compress: boolean): number => {
  const dataUrl = buildSolidPng(WIDTH, HEIGHT);
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const props = pdf.getImageProperties(dataUrl);
  const imgHeightInMm = (props.height * pageWidth) / props.width;

  let heightLeft = imgHeightInMm;
  let position = 0;
  pdf.addImage(dataUrl, "PNG", 0, position, pageWidth, imgHeightInMm);
  heightLeft -= pageHeight;
  while (heightLeft > 1) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, position, pageWidth, imgHeightInMm);
    heightLeft -= pageHeight;
  }
  return (pdf.output("arraybuffer") as ArrayBuffer).byteLength;
};

describe("PDF 匯出體積", () => {
  it("未開壓縮時 PDF 膨脹到原始 RGB 的量級(這就是 20 MB 的成因)", () => {
    const size = buildPdf(false);
    // Info: (20260731 - Tzuhan) 600×1800 的圖 = 3,240,000 bytes 原始 RGB;
    // Info: (20260731 - Tzuhan) 斷言「至少有原始 RGB 的九成」而非精確值,避免綁死 jsPDF 的實作細節
    expect(size).toBeGreaterThan(RAW_RGB_BYTES * 0.9);
  });

  it("開啟壓縮後同一份文件小兩個數量級以上", () => {
    const compressed = buildPdf(true);
    const uncompressed = buildPdf(false);
    expect(compressed).toBeLessThan(uncompressed / 100);
  });

  it("開啟壓縮後單純內容的文件落在體積預算內", () => {
    expect(buildPdf(true)).toBeLessThan(PDF_EXPORT_SIZE_BUDGET_BYTES);
  });

  it("多頁不會重複嵌入同一張影像(jsPDF 有影像快取)", () => {
    // Info: (20260731 - Tzuhan) 原本懷疑分頁迴圈每頁都重新嵌入整張圖造成 N 倍膨脹。
    // Info: (20260731 - Tzuhan) 實測並非如此,留下此測試以免未來有人「修」掉不存在的問題。
    const dataUrl = buildSolidPng(WIDTH, HEIGHT);
    const sizeOf = (pages: number): number => {
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(dataUrl, "PNG", 0, 0, w, 100);
      for (let i = 1; i < pages; i += 1) {
        pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 0, -i * 100, w, 100);
      }
      return (pdf.output("arraybuffer") as ArrayBuffer).byteLength;
    };
    const one = sizeOf(1);
    const eight = sizeOf(8);
    // Info: (20260731 - Tzuhan) 多 7 頁的成本必須遠低於一張影像的量級(頁面物件本身有固定開銷,
    // Info: (20260731 - Tzuhan) 故不比較倍率而比較增量:若真的每頁重嵌,增量會是 MB 級而非 KB 級)
    expect(eight - one).toBeLessThan(RAW_RGB_BYTES * 0.01);
  });
});

describe("匯出檔名", () => {
  it("方案代碼開頭,便於與 CSV 交叉對照", () => {
    expect(buildExportFileName(0, "sea", "高雄", "東京")).toMatch(/^R01-SEA_/);
  });

  it("特殊字元轉為連字號,保留中日韓文字", () => {
    expect(sanitizeFileNamePart("高雄港/Kaohsiung (TW)")).toBe(
      "高雄港-Kaohsiung-TW",
    );
  });
});
