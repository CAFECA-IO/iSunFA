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
const KANGXI_ONE = 0x2f00; // Info: (20260817 - Emily) 康熙部首區的第一個,對應 U+4E00
const KANGXI_LAST = 0x2fd5; // Info: (20260817 - Emily) 康熙部首區的最後一個
const HAN_ONE = 0x4e00;
const HAN_TWO = 0x4e8c;

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

/**
 * Info: (20260817 - Emily) 來源側可以自己指定的 fixture（PR review A1）。
 *
 * 原本的 `cmap()` 來源碼一律是 `hex(index + 3)`，永遠遠離相容區 ——
 * 於是「來源側被改寫」這個缺陷**在測試裡看不見**。
 * 這一組 helper 的存在就是為了把來源側放進相容區。
 */
const bfchar = (entries: ReadonlyArray<readonly [number, number]>): string =>
  [
    "/CIDInit /ProcSet findresource begin",
    `${entries.length} beginbfchar`,
    ...entries.map(([src, dst]) => `<${hex(src)}> <${hex(dst)}>`),
    "endbfchar",
    "endcmap",
  ].join("\n");

const bfrange = (
  entries: ReadonlyArray<{
    lo: number;
    hi: number;
    dst: number | readonly number[];
  }>,
): string =>
  [
    "/CIDInit /ProcSet findresource begin",
    `${entries.length} beginbfrange`,
    ...entries.map(({ lo, hi, dst }) =>
      Array.isArray(dst)
        ? `<${hex(lo)}> <${hex(hi)}> [${dst.map((d) => `<${hex(d)}>`).join(" ")}]`
        : `<${hex(lo)}> <${hex(hi)}> <${hex(dst as number)}>`,
    ),
    "endbfrange",
    "endcmap",
  ].join("\n");

/** Info: (20260817 - Emily) 從輸出反解出來源側,用來斷言它沒被動過 */
const sourcesOf = (text: string): number[] =>
  [...text.matchAll(/^<([0-9A-Fa-f]{4})>/gm)].map((m) => parseInt(m[1], 16));

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
   * Info: (20260817 - Emily) 「沒改到任何碼位」的兩種成因要分得開（PR review B2）。
   *
   * 這一份**只有**沒對照的相容區碼位:一個都沒改,但它**不乾淨** ——
   * 紙上那個字仍然搜不到,只是我們還沒有它的對照。
   * 兩者若共用 `clean`，現場會把它當成「這份本來就沒問題」然後跳過,
   * 而 `unmapped` 這份清單正是下一次擴 `SUPPLEMENT_MAP` 的依據。
   */
  it("says no_mapping — not clean — when every compatibility code lacks a mapping", async () => {
    const pdf = await buildPdf(cmap([SUPPLEMENT_UNLISTED]));
    const result = await repairPdfToUnicode(pdf);
    expect(result.decision).toBe("no_mapping");
    expect(result.replaced).toBe(0);
    expect(result.unmapped).toEqual([`U+${hex(SUPPLEMENT_UNLISTED)}`]);
    // Info: (20260817 - Emily) 沒改就不重存 —— 與 clean 同一條契約
    expect(result.bytes).toBe(pdf);
  });

  // Info: (20260817 - Emily) 反面:真的乾淨時不得回 no_mapping
  it("keeps clean for a CMap with no compatibility codes at all", async () => {
    const pdf = await buildPdf(cmap([HAN_SCRIPT]));
    const result = await repairPdfToUnicode(pdf);
    expect(result.decision).toBe("clean");
    expect(result.unmapped).toEqual([]);
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

/**
 * Info: (20260817 - Emily) PR review A1：來源側（glyph id / CID）不得被改寫。
 *
 * 這一組是第一版完全沒有的。第一版的 fixture 剛好避開了會出事的輸入，
 * 而「修完抽回來相容區部首 0 個」那個實測憑證**與缺陷相容** ——
 * 來源側被改壞之後那些 entry 不再指向相容區，所以「0 個」照樣成立。
 */
describe("rewriteCMapText 的來源側保護", () => {
  it("bfchar 的來源 CID 落在相容區時原封不動", () => {
    const source = bfchar([[KANGXI_SCRIPT, HAN_TALL]]);
    const result = rewriteCMapText(source);
    expect(result.replaced).toBe(0);
    expect(sourcesOf(result.text)).toEqual([KANGXI_SCRIPT]);
    expect(result.text).toBe(source);
  });

  it("來源在相容區、目標也在相容區時,只改目標", () => {
    const result = rewriteCMapText(bfchar([[KANGXI_SCRIPT, KANGXI_TALL]]));
    expect(result.replaced).toBe(1);
    expect(sourcesOf(result.text)).toEqual([KANGXI_SCRIPT]);
    expect(result.text).toContain(`<${hex(HAN_TALL)}>`);
  });

  /**
   * Info: (20260817 - Emily) 這一條擋的是最嚴重的那種：
   * 區間端點被改寫會產生 `lo > hi` 的非法區間,壞掉的不是一個字,
   * 是那個字型的整張對照表（讀取器可能整張拒收）。
   */
  it("bfrange 的區間端點永遠不被改寫,lo <= hi 仍成立", () => {
    const source = bfrange([{ lo: KANGXI_ONE, hi: KANGXI_LAST, dst: HAN_ONE }]);
    const result = rewriteCMapText(source);
    expect(result.replaced).toBe(0);
    expect(result.text).toBe(source);

    const pairs = [
      ...result.text.matchAll(/<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]{4})>\s*</g),
    ];
    pairs.forEach(([, lo, hi]) => {
      expect(parseInt(lo, 16)).toBeLessThanOrEqual(parseInt(hi, 16));
    });
  });

  it("bfrange 只改目標,端點留著", () => {
    const result = rewriteCMapText(
      bfrange([{ lo: 0x0003, hi: 0x0005, dst: KANGXI_SCRIPT }]),
    );
    expect(result.replaced).toBe(1);
    expect(result.text).toContain(`<0003> <0005> <${hex(HAN_SCRIPT)}>`);
  });

  /**
   * Info: (20260817 - Emily) 陣列形式：`<lo> <hi> [<d1> <d2> …]`。
   * 第一版連這個都會把兩個端點一起改掉。
   */
  it("bfrange 的陣列形式:端點不動,陣列每一項都改", () => {
    const result = rewriteCMapText(
      bfrange([
        {
          lo: KANGXI_SCRIPT,
          hi: KANGXI_TALL,
          dst: [KANGXI_ONE, HAN_TWO, SUPPLEMENT_CIVILIAN],
        },
      ]),
    );
    expect(result.replaced).toBe(2);
    expect(sourcesOf(result.text)).toEqual([KANGXI_SCRIPT]);
    expect(result.text).toContain(
      `<${hex(KANGXI_SCRIPT)}> <${hex(KANGXI_TALL)}> [`,
    );
    expect(result.text).toContain(`<${hex(HAN_ONE)}>`);
    expect(result.text).toContain(`<${hex(HAN_CIVILIAN)}>`);
  });

  /** Info: (20260817 - Emily) 區塊之外的 token 一律不動（codespacerange 的端點也在相容區時） */
  it("bfchar/bfrange 區塊之外的碼位不動", () => {
    const source = [
      "1 begincodespacerange",
      `<${hex(KANGXI_SCRIPT)}> <${hex(KANGXI_TALL)}>`,
      "endcodespacerange",
      "1 beginbfchar",
      `<0003> <${hex(KANGXI_ONE)}>`,
      "endbfchar",
    ].join("\n");
    const result = rewriteCMapText(source);
    expect(result.replaced).toBe(1);
    expect(result.text).toContain(
      `<${hex(KANGXI_SCRIPT)}> <${hex(KANGXI_TALL)}>\nendcodespacerange`,
    );
  });
});
