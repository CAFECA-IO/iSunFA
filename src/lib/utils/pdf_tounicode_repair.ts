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
  /** Info: (20260817 - Emily) 改掉幾個**目標側**碼位 */
  readonly replaced: number;
  /** Info: (20260817 - Emily) 目標側是相容區、但沒有對照可用的碼位（`U+2EA1` 這種寫法） */
  readonly unmapped: readonly string[];
}

const toHex = (codePoint: number): string =>
  codePoint.toString(16).toUpperCase().padStart(4, "0");

/**
 * Info: (20260817 - Emily) 碼位落在兩個相容區之一。
 *
 * 匯出是為了讓驗收腳本用**同一個**判準（`scripts/uat_carbon_report.ts`）。
 * 各寫一份的話，兩邊遲早分岔 —— 而分岔的那天驗收會說「沒問題」。
 */
export const isCompatibilityCode = (codePoint: number): boolean =>
  (codePoint >= RADICAL_SUPPLEMENT_START &&
    codePoint <= RADICAL_SUPPLEMENT_END) ||
  (codePoint >= KANGXI_START && codePoint <= KANGXI_END);

interface IHexToken {
  readonly start: number;
  readonly end: number;
  readonly hex: string;
}

/** Info: (20260817 - Emily) `beginbfchar` 的一筆:`<src> <dst>` */
export interface ICMapCharEntry {
  readonly kind: "bfchar";
  /** Info: (20260817 - Emily) 來源側 = glyph id / CID。**永遠不得改寫** */
  readonly source: number;
  readonly destinations: readonly IHexToken[];
}

/** Info: (20260817 - Emily) `beginbfrange` 的一筆:`<lo> <hi> <dst>` 或 `<lo> <hi> [<d1> …]` */
export interface ICMapRangeEntry {
  readonly kind: "bfrange";
  /** Info: (20260817 - Emily) 來源側區間下界。**永遠不得改寫** */
  readonly low: number;
  /** Info: (20260817 - Emily) 來源側區間上界。**永遠不得改寫**；`low <= high` 是結構不變量 */
  readonly high: number;
  readonly destinations: readonly IHexToken[];
}

export type ICMapEntry = ICMapCharEntry | ICMapRangeEntry;

/**
 * Info: (20260817 - Emily) 找出 CMap 裡**只有目標側**的十六進位 token。
 *
 * ## 為什麼一定要分來源側與目標側（PR review A1）
 *
 * 第一版用 `/<([0-9A-Fa-f]{4})>/g` 掃全部 token，於是**來源側也被改寫**：
 *
 * ```
 * bfchar   <2F42> <6587>              → <6587> <6587>   glyph 2F42 的對照整條消失
 * bfrange  <2F00> <2FDF> <4E00>       → <4E00> <2FDF>   lo > hi 的非法區間
 * bfrange  <2F42> <2F44> [<4E00> …]   → <6587> <65A4>   兩個端點都被改
 * ```
 *
 * 第二種比第一種嚴重：壞掉的不是一個字，是那個字型的**整張對照表**
 * （讀取器可能整張拒收）。
 *
 * **而第一版的測試與實測憑證都偵測不到它**：
 * - fixture 的來源碼一律是 `hex(index + 3)`（`<0003>`、`<0004>`…），永遠遠離相容區
 * - 「修完抽回來相容區部首 0 個」與「來源側被改壞」是**相容的** ——
 *   來源側改壞之後那些 entry 不再指向相容區，所以「0 個」照樣成立
 *
 * ## 今天有沒有踩到（08-17 實測，兩份真報告）
 *
 * 沒有。Chrome/Skia 對 subset 字型**重新編號成小 CID**：
 * `sample_57p.pdf` 與 `smswybo3j.pdf` 的來源側最大 CID 都是 **0x85B**（2139），
 * 而相容區窗口是 0x2E80–0x2FDF，整段在 CID 範圍之外 —— 來源側落在相容區 **0 筆**。
 *
 * **但那是 Chrome 目前的行為，不是保證。** 若改用 Identity-H 保留原字型 glyph id
 * （Noto Sans CJK TC 約 65,535 個 glyph），一份用到約 2,000 個 glyph 的報告
 * 落進那個 128 寬窗口的期望值約 4 個 —— 換版本、換字型就會踩。
 *
 * ## 結構
 *
 * ```
 * beginbfchar   <src> <dst>                       src 跳過,dst 改寫
 * beginbfrange  <lo> <hi> <dst>                   lo/hi 跳過,dst 改寫
 * beginbfrange  <lo> <hi> [<d1> <d2> …]           lo/hi 跳過,陣列每一項改寫
 * ```
 *
 * 區塊之外的一切（`codespacerange`、`CIDSystemInfo`…）一律不動。
 *
 * 回傳結構化的 entry（兩側都帶著）而不是只回目標 token,是為了讓驗收腳本
 * 能對真報告查同樣的不變量（來源側是否落在相容區、`low <= high` 是否成立）——
 * 那一項判準與這裡的改寫必須讀同一個 parser,否則驗的是替身。
 */
export const parseCMapEntries = (text: string): ICMapEntry[] => {
  const entries: ICMapEntry[] = [];

  const walk = (kind: "bfchar" | "bfrange"): void => {
    const block = new RegExp(`begin${kind}([\\s\\S]*?)end${kind}`, "g");
    for (const match of text.matchAll(block)) {
      const body = match[1];
      const offset = (match.index ?? 0) + `begin${kind}`.length;
      const tokens = [...body.matchAll(/<([0-9A-Fa-f]+)>|(\[)|(\])/g)].map(
        (token) => ({
          start: offset + (token.index ?? 0),
          end: offset + (token.index ?? 0) + token[0].length,
          hex: token[1],
          open: token[2] !== undefined,
          close: token[3] !== undefined,
        }),
      );

      let index = 0;
      while (index < tokens.length) {
        if (kind === "bfchar") {
          // Info: (20260817 - Emily) <src> <dst> —— 第一個是來源,第二個是目標
          const source = tokens[index];
          const destination = tokens[index + 1];
          if (source?.hex === undefined || destination?.hex === undefined)
            break;
          entries.push({
            kind: "bfchar",
            source: parseInt(source.hex, 16),
            destinations: [
              {
                start: destination.start,
                end: destination.end,
                hex: destination.hex,
              },
            ],
          });
          index += 2;
          continue;
        }
        // Info: (20260817 - Emily) <lo> <hi> 之後才是目標(單值或陣列)
        const low = tokens[index];
        const high = tokens[index + 1];
        const third = tokens[index + 2];
        if (low?.hex === undefined || high?.hex === undefined || !third) break;
        const bounds = {
          kind: "bfrange" as const,
          low: parseInt(low.hex, 16),
          high: parseInt(high.hex, 16),
        };
        if (third.open) {
          const destinations: IHexToken[] = [];
          let cursor = index + 3;
          while (cursor < tokens.length && !tokens[cursor].close) {
            const item = tokens[cursor];
            if (item.hex !== undefined) {
              destinations.push({
                start: item.start,
                end: item.end,
                hex: item.hex,
              });
            }
            cursor += 1;
          }
          entries.push({ ...bounds, destinations });
          index = cursor + 1;
          continue;
        }
        if (third.hex === undefined) break;
        entries.push({
          ...bounds,
          destinations: [
            { start: third.start, end: third.end, hex: third.hex },
          ],
        });
        index += 3;
      }
    }
  };

  walk("bfchar");
  walk("bfrange");
  return entries;
};

/**
 * Info: (20260817 - Emily) 只取目標側 token,依出現位置排序（改寫時要照順序切字串）。
 */
const collectDestinationTokens = (text: string): IHexToken[] =>
  parseCMapEntries(text)
    .flatMap((entry) => [...entry.destinations])
    .sort((left, right) => left.start - right.start);

/**
 * Info: (20260817 - Emily) 重寫一段 CMap 文字的**目標側**。
 *
 * 只認 4 位十六進位的目標：ToUnicode 的目標是 UTF-16BE，BMP 內的字剛好 4 位。
 * 更長的目標（代理對、多字序列）不可能是單一個相容區部首，跳過是對的不是漏掉。
 */
export const rewriteCMapText = (text: string): ICMapRewrite => {
  const unmapped = new Set<string>();
  let replaced = 0;
  const pieces: string[] = [];
  let cursor = 0;

  collectDestinationTokens(text).forEach((token) => {
    if (token.hex.length !== 4) return;
    const codePoint = parseInt(token.hex, 16);
    if (!isCompatibilityCode(codePoint)) return;
    const mapped = mapCompatibilityRadical(codePoint);
    if (mapped === null) {
      unmapped.add(`U+${toHex(codePoint)}`);
      return;
    }
    pieces.push(text.slice(cursor, token.start), `<${toHex(mapped)}>`);
    cursor = token.end;
    replaced += 1;
  });

  pieces.push(text.slice(cursor));
  return {
    text: pieces.join(""),
    replaced,
    unmapped: [...unmapped].sort(),
  };
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
  /**
   * Info: (20260817 - Emily) 四種結果,每一種都要能與其他三種在現場分得開（PR review B2）。
   *
   * - `repaired`  改了至少一個碼位,回傳的是新的 bytes
   * - `clean`     整份找不到任何相容區碼位 —— 真的乾淨
   * - `no_mapping` 找到了相容區碼位,但**一個都沒有對照可用**（全進 `unmapped`）
   * - `failed`    讀不開或寫不回,原封不動回傳
   *
   * `no_mapping` 原本併在 `clean` 裡,而那是錯的命名:那份報告的紙上有搜不到的字,
   * 只是我們還沒有那幾個碼位的對照。兩者的下一步完全不同 ——
   * `clean` 不需要任何人做任何事,`no_mapping` 是「該擴 `SUPPLEMENT_MAP` 了」的訊號,
   * 而 `unmapped` 那份清單就是擴表的依據。叫同一個名字的話,現場只會看到 `clean` 然後跳過。
   */
  readonly decision: "repaired" | "clean" | "no_mapping" | "failed";
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
      /**
       * Info: (20260817 - Emily) 沒改到任何碼位有兩種成因,不能都叫 `clean`（PR review B2）。
       *
       * `unmapped` 非空表示**找到了**相容區碼位、只是沒有對照可用 ——
       * 那份報告的紙上仍然有搜不到的字。回 `clean` 的話現場會直接跳過它,
       * 而 `unmapped` 這份清單正是下一次擴 `SUPPLEMENT_MAP` 的依據。
       */
      return {
        bytes: input,
        streams: 0,
        replaced: 0,
        unmapped: [...unmapped].sort(),
        decision: unmapped.size > 0 ? "no_mapping" : "clean",
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
