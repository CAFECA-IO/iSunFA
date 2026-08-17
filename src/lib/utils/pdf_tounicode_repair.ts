/**
 * Info: (20260817 - Emily) 列印後修 PDF 的 ToUnicode 對照表
 * (`data/issue_drafts/open/38_pdf_tounicode_radicals.md`)。
 *
 * ## 症狀
 *
 * 成品 PDF 看起來完全正常，但**搜尋與複製會拿到錯的字**。
 * 實測 2026-08-14 那份 57 頁報告：2,560 個字、44 種，
 * 其中包含「高」「文」「工」「行」「車」「人」—— 也就是說在 Acrobat 裡
 * 搜「高興昌」搜不到，複製出去貼到 Excel 也是錯的字。
 *
 * 那些字的碼位落在**康熙部首區**（U+2F00–U+2FDF）：`U+2F42` 長得跟 `U+6587` 一模一樣，
 * 但它是字典用來標示部首的字元，不是「文」。
 *
 * ## 成因：不在我們的內容裡，在 Chrome 產生文字層的那一步
 *
 * 08-17 用同一套字型堆疊做過對照實驗，這是本修正的唯一依據：
 *
 * ```
 * 輸入 HTML  U+6587 U+7528 U+884C U+4E00 U+9AD8   （乾淨的漢字）
 * 印出 PDF   U+2F42 U+2F64 U+2F8F U+2F00 U+2FBC   （全部變成部首）
 * ```
 *
 * 逐字型測過：`Noto Sans CJK TC`、`Noto Serif CJK TC`、`Noto Sans Mono CJK TC` 會，
 * `Droid Sans Fallback`、`WenQuanYi Zen Hei` 不會 —— 差別在前者的 cmap 讓部首與漢字
 * **共用同一個字形**，而 Chrome 反查 ToUnicode 時取的是碼位較小的那一個。
 *
 * 所以：
 *
 * - 修正端**不是**匯入、不是儲存的內容、不是抽取器 —— 那三處的字都是對的
 * - 也不該在抽取器補正規化：那只會讓**我們自己**讀得對，
 *   使用者在 Acrobat 裡按 Ctrl+F 還是搜不到。生效端在紙上，不在我們的讀取端
 * - 換字型可以繞過，但代價是整份報告的字體 —— 那是用排版換正確性，不划算
 *
 * ## 判準：只改對照表，不改任何一個字形
 *
 * 這支只重寫 ToUnicode CMap 裡的目標碼位，不動內容串流、不動字型、不動版面。
 * 頁面上畫出來的東西一個像素都不會變，變的只有「選取這個字時複製到什麼」。
 *
 * 每一次替換都是 4 個十六進位數字換 4 個十六進位數字（`<2F42>` → `<6587>`），
 * 長度不變，所以不會動到 CMap 以外的結構。
 *
 * ## 判準：修不動就原樣回傳，不讓列印失敗
 *
 * 與 `narrowVisionPagesToRange` 同一條：補完整性的功能不該讓主流程失敗。
 * 一份「可以看但搜不到」的報告，仍然遠好過一份沒有產出的報告。
 * 但**不修得靜悄悄** —— 回傳值帶著改了幾處、以及遇到卻沒有對照的字，
 * 由呼叫端記 log；少了那行，「這份沒問題」與「這份修失敗了」在現場分不出來。
 */

import {
  PDFDocument,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
} from "pdf-lib";
import zlib from "node:zlib";

/** Info: (20260817 - Emily) CJK 部首補充區 */
const RADICAL_SUPPLEMENT_START = 0x2e80;
const RADICAL_SUPPLEMENT_END = 0x2eff;
/** Info: (20260817 - Emily) 康熙部首區 */
const KANGXI_START = 0x2f00;
const KANGXI_END = 0x2fdf;

/**
 * Info: (20260817 - Emily) 康熙部首區的每一個字，Unicode 都給了到漢字的相容分解，
 * 所以那一區直接用 NFKC 就是權威對照，不需要自己列表。
 *
 * **部首補充區沒有。** 那一區大多是「變體部首」（三點水、豎心旁那一類），
 * 本來就沒有對應的漢字，硬映會把字改錯 —— 所以這裡不做通則，只列實際遇到的。
 *
 * 目前只有一個：U+2EA0 的字形與 U+6C11 完全相同，實測那份報告出現 1 次。
 * 這張表**靠實測長大**：驗收腳本會把每一個沒有對照的字點名出來，
 * 確認字形相同後才加進來。猜不如報告 —— 猜錯是把字改成別的字，那比搜不到更糟。
 */
const SUPPLEMENT_MAP: Readonly<Record<number, number>> = {
  0x2ea0: 0x6c11,
};

/**
 * Info: (20260817 - Emily) 單一碼位的對照。沒有把握就回 `null`（由呼叫端點名），
 * 不要回一個猜出來的字。
 */
export const mapCompatibilityRadical = (codePoint: number): number | null => {
  if (codePoint >= KANGXI_START && codePoint <= KANGXI_END) {
    const normalised = String.fromCodePoint(codePoint).normalize("NFKC");
    if ([...normalised].length !== 1) return null;
    const mapped = normalised.codePointAt(0) ?? codePoint;
    return mapped === codePoint ? null : mapped;
  }
  if (
    codePoint >= RADICAL_SUPPLEMENT_START &&
    codePoint <= RADICAL_SUPPLEMENT_END
  ) {
    return SUPPLEMENT_MAP[codePoint] ?? null;
  }
  return null;
};

export interface ICMapRewrite {
  readonly text: string;
  /** Info: (20260817 - Emily) 改掉幾個碼位 */
  readonly replaced: number;
  /** Info: (20260817 - Emily) 是相容區、但沒有對照可用的碼位（`U+2EA1` 這種寫法） */
  readonly unmapped: readonly string[];
}

/** Info: (20260817 - Emily) 十六進位碼位的字面樣貌：CMap 裡一律是 `<XXXX>` */
const CMAP_CODE = /<([0-9A-Fa-f]{4})>/g;

const toHex = (codePoint: number): string =>
  codePoint.toString(16).toUpperCase().padStart(4, "0");

/**
 * Info: (20260817 - Emily) 重寫一段 CMap 文字。
 *
 * 刻意只認 4 位十六進位：ToUnicode 的目標是 UTF-16BE，BMP 內的字剛好 4 位。
 * 代理對（8 位）不在相容區的範圍內，跳過它們是對的，不是漏掉。
 */
export const rewriteCMapText = (text: string): ICMapRewrite => {
  const unmapped = new Set<string>();
  let replaced = 0;
  const rewritten = text.replace(CMAP_CODE, (whole, hex: string) => {
    const codePoint = parseInt(hex, 16);
    const isCompatibility =
      (codePoint >= RADICAL_SUPPLEMENT_START &&
        codePoint <= RADICAL_SUPPLEMENT_END) ||
      (codePoint >= KANGXI_START && codePoint <= KANGXI_END);
    if (!isCompatibility) return whole;
    const mapped = mapCompatibilityRadical(codePoint);
    if (mapped === null) {
      unmapped.add(`U+${toHex(codePoint)}`);
      return whole;
    }
    replaced += 1;
    return `<${toHex(mapped)}>`;
  });
  return { text: rewritten, replaced, unmapped: [...unmapped].sort() };
};

export interface IToUnicodeRepairResult {
  /** Info: (20260817 - Emily) 修好的 PDF；修不動時是原封不動的輸入 */
  readonly bytes: Uint8Array;
  /** Info: (20260817 - Emily) 改動過的 CMap 串流數 */
  readonly streams: number;
  /** Info: (20260817 - Emily) 改掉的碼位總數 */
  readonly replaced: number;
  /** Info: (20260817 - Emily) 相容區但沒有對照的碼位 —— 要進 log，這是下一次擴表的依據 */
  readonly unmapped: readonly string[];
  readonly decision: "repaired" | "clean" | "failed";
}

const isCMapStream = (text: string): boolean =>
  text.includes("beginbfchar") || text.includes("beginbfrange");

/**
 * Info: (20260817 - Emily) 主要進入點。列印完、回傳給使用者之前跑一次。
 *
 * 不 throw：任何一步失敗都回 `decision: "failed"` 與原始 bytes。
 */
export const repairPdfToUnicode = async (
  input: Uint8Array,
): Promise<IToUnicodeRepairResult> => {
  const unchanged = (
    decision: IToUnicodeRepairResult["decision"],
  ): IToUnicodeRepairResult => ({
    bytes: input,
    streams: 0,
    replaced: 0,
    unmapped: [],
    decision,
  });

  try {
    const doc = await PDFDocument.load(input);
    const context = doc.context;
    const unmapped = new Set<string>();
    let streams = 0;
    let replaced = 0;

    context.enumerateIndirectObjects().forEach(([reference, object]) => {
      if (!(object instanceof PDFRawStream)) return;
      const dict = object.dict as PDFDict;
      const filter = dict.get(PDFName.of("Filter"));
      const isFlate =
        filter !== undefined && String(filter).includes("FlateDecode");

      let decoded: Buffer;
      try {
        decoded = isFlate
          ? Buffer.from(zlib.inflateSync(Buffer.from(object.contents)))
          : Buffer.from(object.contents);
      } catch {
        // Info: (20260817 - Emily) 解不開的串流不是 CMap 就是影像，兩者都不該讓整份失敗
        return;
      }

      /**
       * Info: (20260817 - Emily) CMap 是 ASCII 的 PostScript 片段，用 latin1 逐位元組往返，
       * 不要用 utf-8 —— 後者會把非法序列換成 U+FFFD，寫回去就毀了那個串流。
       */
      const text = decoded.toString("latin1");
      if (!isCMapStream(text)) return;

      const rewrite = rewriteCMapText(text);
      rewrite.unmapped.forEach((code) => unmapped.add(code));
      if (rewrite.replaced === 0) return;

      const body = Buffer.from(rewrite.text, "latin1");
      const encoded = isFlate ? zlib.deflateSync(body) : body;
      dict.set(PDFName.of("Length"), PDFNumber.of(encoded.length));
      context.assign(reference, PDFRawStream.of(dict, new Uint8Array(encoded)));
      streams += 1;
      replaced += rewrite.replaced;
    });

    if (replaced === 0) {
      return {
        bytes: input,
        streams: 0,
        replaced: 0,
        unmapped: [...unmapped].sort(),
        decision: "clean",
      };
    }

    /**
     * Info: (20260817 - Emily) `useObjectStreams: false` 是**偏好，不是正確性需求**。
     *
     * 08-17 拿那份 57 頁的報告兩種都跑過：`true` / `false` 都是 143 處、
     * 抽回來都是 0 個部首。所以不要在這裡寫「必須 false 否則會壞」——
     * 我第一版就是那樣寫的，而實測不支持那句話。
     *
     * 選 `false` 的實際理由：不打包成物件流時，CMap 是可以直接用文字工具翻出來看的，
     * 驗收與事後查證都會用到。pdf-lib 的預設是 `true`，所以要明寫。
     */
    const bytes = await doc.save({ useObjectStreams: false });
    return {
      bytes,
      streams,
      replaced,
      unmapped: [...unmapped].sort(),
      decision: "repaired",
    };
  } catch {
    return unchanged("failed");
  }
};
