import zlib from "node:zlib";
import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFNumber,
  PDFDict,
} from "pdf-lib";
import {
  mapCompatibilityRadical,
  repairPdfToUnicode,
  rewriteCMapText,
} from "@/lib/utils/pdf_tounicode_repair";

/**
 * Info: (20260817 - Emily) 全部用碼位寫，不寫字面的部首字元。
 * 部首與漢字在編輯器裡長得一模一樣，寫成字面的話**沒有人能在 review 時看出差別**，
 * 而這支測的就是那個差別。
 */
const KANGXI_SCRIPT = 0x2f42; // Info: (20260817 - Emily) 對應 U+6587
const KANGXI_TALL = 0x2fbc; // Info: (20260817 - Emily) 對應 U+9AD8
const SUPPLEMENT_CIVILIAN = 0x2ea0; // Info: (20260817 - Emily) 對應 U+6C11
const SUPPLEMENT_UNLISTED = 0x2ea1;
const HAN_SCRIPT = 0x6587;
const HAN_TALL = 0x9ad8;
const HAN_CIVILIAN = 0x6c11;

const hex = (codePoint: number): string =>
  codePoint.toString(16).toUpperCase().padStart(4, "0");

const cmap = (targets: readonly number[]): string =>
  [
    "/CIDInit /ProcSet findresource begin",
    "1 begincodespacerange",
    "<0000> <FFFF>",
    "endcodespacerange",
    `${targets.length} beginbfchar`,
    ...targets.map((target, index) => `<${hex(index + 3)}> <${hex(target)}>`),
    "endbfchar",
    "endcmap",
  ].join("\n");

describe("mapCompatibilityRadical", () => {
  it("maps Kangxi radicals to their ideograph via NFKC", () => {
    expect(mapCompatibilityRadical(KANGXI_SCRIPT)).toBe(HAN_SCRIPT);
    expect(mapCompatibilityRadical(KANGXI_TALL)).toBe(HAN_TALL);
  });

  it("maps the observed supplement radical from the explicit table", () => {
    expect(mapCompatibilityRadical(SUPPLEMENT_CIVILIAN)).toBe(HAN_CIVILIAN);
  });

  /**
   * Info: (20260817 - Emily) 這條守的是判準而不是數字：
   * 部首補充區大多是變體部首，沒有對應的漢字。回 `null` 讓它被點名，
   * 比猜一個字塞回去安全 —— 猜錯是把字改成別的字。
   */
  it("returns null for a supplement radical that is not in the table", () => {
    expect(mapCompatibilityRadical(SUPPLEMENT_UNLISTED)).toBeNull();
  });

  it("leaves ordinary ideographs alone", () => {
    expect(mapCompatibilityRadical(HAN_SCRIPT)).toBeNull();
    expect(mapCompatibilityRadical(0x0041)).toBeNull();
  });
});

describe("rewriteCMapText", () => {
  it("rewrites only the compatibility targets and counts them", () => {
    const result = rewriteCMapText(cmap([KANGXI_SCRIPT, HAN_TALL]));
    expect(result.replaced).toBe(1);
    expect(result.text).toContain(`<${hex(HAN_SCRIPT)}>`);
    expect(result.text).not.toContain(`<${hex(KANGXI_SCRIPT)}>`);
    expect(result.text).toContain(`<${hex(HAN_TALL)}>`);
  });

  it("names the compatibility codes it could not map, and leaves them intact", () => {
    const result = rewriteCMapText(cmap([SUPPLEMENT_UNLISTED]));
    expect(result.replaced).toBe(0);
    expect(result.unmapped).toEqual([`U+${hex(SUPPLEMENT_UNLISTED)}`]);
    expect(result.text).toContain(`<${hex(SUPPLEMENT_UNLISTED)}>`);
  });

  /**
   * Info: (20260817 - Emily) 長度不變是整個做法成立的前提：
   * 4 個十六進位數字換 4 個，CMap 以外的結構就不會被牽動。
   */
  it("does not change the length of the stream text", () => {
    const source = cmap([KANGXI_SCRIPT, KANGXI_TALL, SUPPLEMENT_CIVILIAN]);
    const result = rewriteCMapText(source);
    expect(result.replaced).toBe(3);
    expect(result.text).toHaveLength(source.length);
  });

  it("leaves a stream with no compatibility codes byte-identical", () => {
    const source = cmap([HAN_SCRIPT, HAN_TALL]);
    const result = rewriteCMapText(source);
    expect(result.text).toBe(source);
    expect(result.unmapped).toEqual([]);
  });
});

const buildPdf = async (
  streamText: string | null,
  options: { readonly flate: boolean } = { flate: true },
): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  if (streamText !== null) {
    const body = Buffer.from(streamText, "latin1");
    const encoded = options.flate ? zlib.deflateSync(body) : body;
    const dict = doc.context.obj({}) as PDFDict;
    if (options.flate)
      dict.set(PDFName.of("Filter"), PDFName.of("FlateDecode"));
    dict.set(PDFName.of("Length"), PDFNumber.of(encoded.length));
    doc.context.register(PDFRawStream.of(dict, new Uint8Array(encoded)));
  }
  return doc.save({ useObjectStreams: false });
};

const readCMaps = async (bytes: Uint8Array): Promise<string[]> => {
  const doc = await PDFDocument.load(bytes);
  const found: string[] = [];
  doc.context.enumerateIndirectObjects().forEach(([, object]) => {
    if (!(object instanceof PDFRawStream)) return;
    const dict = object.dict as PDFDict;
    const filter = dict.get(PDFName.of("Filter"));
    const raw = Buffer.from(object.contents);
    let text: string;
    try {
      text =
        filter !== undefined && String(filter).includes("FlateDecode")
          ? zlib.inflateSync(raw).toString("latin1")
          : raw.toString("latin1");
    } catch {
      return;
    }
    if (text.includes("beginbfchar")) found.push(text);
  });
  return found;
};

describe("repairPdfToUnicode", () => {
  it("rewrites the ToUnicode stream inside a real PDF", async () => {
    const pdf = await buildPdf(cmap([KANGXI_SCRIPT, KANGXI_TALL, HAN_SCRIPT]));
    const result = await repairPdfToUnicode(pdf);

    expect(result.decision).toBe("repaired");
    expect(result.streams).toBe(1);
    expect(result.replaced).toBe(2);

    const [text] = await readCMaps(result.bytes);
    expect(text).toContain(`<${hex(HAN_TALL)}>`);
    expect(text).not.toContain(`<${hex(KANGXI_SCRIPT)}>`);
    expect(text).not.toContain(`<${hex(KANGXI_TALL)}>`);
  });

  /**
   * Info: (20260817 - Emily) 串流要用 latin1 逐位元組往返。
   *
   * 用 utf-8 的話，非 ASCII 位元組會被換成 U+FFFD，寫回去就毀了那個串流 ——
   * 而且毀得很安靜：CMap 仍然解析得動，只是有幾個字對照沒了。
   * 這條放一個 0xE9 在註解裡，改成 utf-8 會讓它紅。
   */
  it("preserves non-ASCII bytes elsewhere in the stream", async () => {
    const marker = "%éÿ\n";
    const pdf = await buildPdf(marker + cmap([KANGXI_SCRIPT]));
    const result = await repairPdfToUnicode(pdf);
    expect(result.replaced).toBe(1);
    const [text] = await readCMaps(result.bytes);
    expect(text.startsWith(marker)).toBe(true);
  });

  it("handles an uncompressed ToUnicode stream too", async () => {
    const pdf = await buildPdf(cmap([KANGXI_SCRIPT]), { flate: false });
    const result = await repairPdfToUnicode(pdf);
    expect(result.replaced).toBe(1);
    const [text] = await readCMaps(result.bytes);
    expect(text).toContain(`<${hex(HAN_SCRIPT)}>`);
  });

  /**
   * Info: (20260817 - Emily) 沒得修時要回**原封不動的那份**，不是重存一份。
   * 重存會改變位元組卻不改變內容，之後任何「輸出有沒有變」的比對都會失去意義。
   */
  it("returns the input untouched when there is nothing to repair", async () => {
    const pdf = await buildPdf(cmap([HAN_SCRIPT]));
    const result = await repairPdfToUnicode(pdf);
    expect(result.decision).toBe("clean");
    expect(result.streams).toBe(0);
    expect(result.bytes).toBe(pdf);
  });

  it("reports unmapped compatibility codes without failing", async () => {
    const pdf = await buildPdf(cmap([SUPPLEMENT_UNLISTED, KANGXI_SCRIPT]));
    const result = await repairPdfToUnicode(pdf);
    expect(result.decision).toBe("repaired");
    expect(result.unmapped).toEqual([`U+${hex(SUPPLEMENT_UNLISTED)}`]);
  });

  /**
   * Info: (20260817 - Emily) 與 `narrowVisionPagesToRange` 同一條契約：
   * 補完整性的功能不該讓主流程失敗。壞掉的輸入要回原樣 + `failed`，不能 throw。
   */
  it("returns the original bytes and says so when the PDF cannot be parsed", async () => {
    const broken = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0x01]);
    const result = await repairPdfToUnicode(broken);
    expect(result.decision).toBe("failed");
    expect(result.bytes).toBe(broken);
    expect(result.replaced).toBe(0);
  });
});
