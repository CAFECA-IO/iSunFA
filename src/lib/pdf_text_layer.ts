// Info: (20260730 - Tzuhan) PDF 文字層抽取與品質閘門
// Info: (20260730 - Tzuhan) 動機:匯入路由原本一律把 PDF 以 base64 inlineData 丟給視覺模型,
// Info: (20260730 - Tzuhan) 導致 >14MB 的報告直接被 VA_FILE_TOO_LARGE 擋掉且無降級路徑(實測台積 30.3MB、三星 17.4MB 皆進不來)。
// Info: (20260730 - Tzuhan) 實測四份真實報告的文字層皆可用(509~928 字/頁,不需 OCR),故改為「文字層優先」:
// Info: (20260730 - Tzuhan) 乾淨就送純文字(順帶解除大小限制、大幅省 token),不乾淨才退回原檔走視覺模型。
// Info: (20260730 - Tzuhan) 本模組刻意拆成「純判定函數」與「薄 IO 包裝」兩層,判定邏輯不碰 IO 才可被單元測試。

import {
  PdfTextLayerDecisionEnum,
  PDF_TEXT_LAYER_MAX_NUMERIC_UNDECODED,
  PDF_TEXT_LAYER_MAX_UNDECODED_RATIO,
  PDF_TEXT_LAYER_MIN_CHARS_PER_PAGE,
  PDF_UNDECODED_CHAR,
  PDF_TEXT_CELL_SEPARATOR,
  PDF_TEXT_PAGE_JOINER,
  PDF_TEXT_PAGE_MARKER_PATTERN,
  PDF_TEXT_PAGE_SLICE_MIN_CHARS,
  PDF_TEXT_PAGE_SLICE_PADDING,
} from "@/constants/pdf_text_layer";

export interface IPdfTextLayerQuality {
  chars: number;
  pages: number;
  charsPerPage: number;
  undecodedChars: number;
  undecodedRatio: number;
  /** Info: (20260730 - Tzuhan) 緊鄰數字或數量單位的解碼失敗字元數——這類失真會直接汙染排放量 */
  numericUndecodedChars: number;
}

export interface IPdfTextLayerAssessment {
  quality: IPdfTextLayerQuality;
  decision: PdfTextLayerDecisionEnum;
  /** Info: (20260730 - Tzuhan) 判定理由代碼,供 UI 與 log 呈現(不是給人看的句子,文案由 i18n 決定) */
  reason: string;
}

export const PDF_TEXT_LAYER_REASON = {
  CLEAN: "text_layer_clean",
  TOO_SPARSE: "text_layer_too_sparse",
  UNDECODED_RATIO: "text_layer_undecoded_ratio",
  UNDECODED_NUMERIC: "text_layer_undecoded_numeric",
  NO_VISION_FALLBACK: "no_vision_fallback",
} as const;

// Info: (20260730 - Tzuhan) 數量語境:替換字元附近若出現這些字元,代表失真發生在數據上而非敘述文字
const NUMERIC_CONTEXT_PATTERN = /[0-9%年月日]|公噸|噸|度|公升|立方/;

/**
 * Info: (20260730 - Tzuhan) 統計文字層品質。純函數,不碰 IO。
 * numericUndecodedChars 的判準:連續替換字元段的前後 3 字內出現數字、年、%、公噸等數量語彙。
 */
export function measurePdfTextLayer(
  text: string,
  pages: number,
): IPdfTextLayerQuality {
  const chars = text.length;
  const safePages = Math.max(1, pages);
  const undecodedChars = text.split(PDF_UNDECODED_CHAR).length - 1;

  // Info: (20260730 - Tzuhan) 以「連續失敗字元」為單位判定,而非逐字:
  // Info: (20260730 - Tzuhan) 「民國113年」整串數字會被抽成一段連續替換字元,只有頭尾鄰接得到數量語彙,
  // Info: (20260730 - Tzuhan) 逐字判定會漏算中間那幾個。整段命中即整段計入。
  let numericUndecodedChars = 0;
  const runPattern = new RegExp(`${PDF_UNDECODED_CHAR}+`, "g");
  let match = runPattern.exec(text);
  while (match !== null) {
    const before = text.slice(Math.max(0, match.index - 3), match.index);
    const after = text.slice(
      match.index + match[0].length,
      match.index + match[0].length + 3,
    );
    if (NUMERIC_CONTEXT_PATTERN.test(before + after)) {
      numericUndecodedChars += match[0].length;
    }
    match = runPattern.exec(text);
  }

  return {
    chars,
    pages: safePages,
    charsPerPage: Math.round(chars / safePages),
    undecodedChars,
    undecodedRatio: chars === 0 ? 1 : undecodedChars / chars,
    numericUndecodedChars,
  };
}

/**
 * Info: (20260730 - Tzuhan) 依品質決定走純文字或退回視覺模型。
 * canUseVision 為 false(原檔超過 inlineData 上限)且文字層不可信時回 REJECT——
 * 寧可明確拒絕,也不讓失真的數字無聲進入報告(零捏造)。
 */
export function assessPdfTextLayer(
  text: string,
  pages: number,
  canUseVision: boolean,
): IPdfTextLayerAssessment {
  const quality = measurePdfTextLayer(text, pages);

  const fallback = (reason: string): IPdfTextLayerAssessment => ({
    quality,
    decision: canUseVision
      ? PdfTextLayerDecisionEnum.VISION
      : PdfTextLayerDecisionEnum.REJECT,
    reason: canUseVision ? reason : PDF_TEXT_LAYER_REASON.NO_VISION_FALLBACK,
  });

  if (quality.charsPerPage < PDF_TEXT_LAYER_MIN_CHARS_PER_PAGE) {
    return fallback(PDF_TEXT_LAYER_REASON.TOO_SPARSE);
  }
  if (quality.numericUndecodedChars > PDF_TEXT_LAYER_MAX_NUMERIC_UNDECODED) {
    return fallback(PDF_TEXT_LAYER_REASON.UNDECODED_NUMERIC);
  }
  if (quality.undecodedRatio > PDF_TEXT_LAYER_MAX_UNDECODED_RATIO) {
    return fallback(PDF_TEXT_LAYER_REASON.UNDECODED_RATIO);
  }

  return {
    quality,
    decision: PdfTextLayerDecisionEnum.TEXT,
    reason: PDF_TEXT_LAYER_REASON.CLEAN,
  };
}

/**
 * Info: (20260730 - Tzuhan) 薄 IO 包裝:抽 PDF 文字層。
 * pdf-parse 走 pdfjs legacy build,是 CPU 密集同步解析,故限定於伺服端呼叫。
 * 抽取失敗一律回 null 交給呼叫端降級,不吞錯也不猜測。
 */
export async function extractPdfTextLayer(
  buffer: Buffer,
): Promise<{ text: string; pages: number } | null> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      // Info: (20260730 - Tzuhan) 必須明示保留儲存格結構:盤查報告的價值集中在排放量統計表,
      // Info: (20260730 - Tzuhan) 不帶欄位分隔抽出來的表格會塌成一串沒有歸屬的數字(實測 poppler 預設模式即如此),
      // Info: (20260730 - Tzuhan) 逐字照抄會照抄出無法對齊的內容。cellSeparator 讓同列儲存格以 tab 分隔,LLM 才讀得出欄位歸屬。
      const result = await parser.getText({
        cellSeparator: PDF_TEXT_CELL_SEPARATOR,
        pageJoiner: PDF_TEXT_PAGE_JOINER,
      });
      return {
        text: result.text ?? "",
        pages: result.total ?? 0,
      };
    } finally {
      await parser.destroy();
    }
  } catch {
    return null;
  }
}

/**
 * Info: (20260730 - Tzuhan) 以頁邊界標記把文字層切成單頁陣列。純函數。
 * 標記由 extractPdfTextLayer 植入(`-- p.N/總頁 --`),位於每頁尾端,故標記前的文字屬於該頁。
 * 找不到任何標記時回傳單一元素(整份文字),呼叫端據此退回送全文。
 */
export function splitTextByPages(text: string): string[] {
  const pages: string[] = [];
  let cursor = 0;
  const pattern = new RegExp(PDF_TEXT_PAGE_MARKER_PATTERN.source, "g");
  let match = pattern.exec(text);
  while (match !== null) {
    pages.push(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    match = pattern.exec(text);
  }
  // Info: (20260730 - Tzuhan) 最後一頁通常沒有結尾標記,殘餘文字補為一頁(非空才補)
  const tail = text.slice(cursor);
  if (tail.trim().length > 0) pages.push(tail);
  return pages.length > 0 ? pages : [text];
}

export interface IPageSliceResult {
  text: string;
  /** Info: (20260730 - Tzuhan) 實際取用的頁碼範圍(1-based,含);退回全文時為 null */
  range: { from: number; to: number } | null;
  /** Info: (20260730 - Tzuhan) true 表示切片不可用已退回全文——呼叫端應記錄,這是成本與品質的分水嶺 */
  fellBack: boolean;
}

/**
 * Info: (20260730 - Tzuhan) 依頁碼範圍切出文字(前後各留 PDF_TEXT_PAGE_SLICE_PADDING 頁緩衝)。
 * 三種情況一律退回全文並標記 fellBack:沒有頁標記、範圍無效、切片過短。
 * 設計立場:切片是省成本的最佳化,不是正確性的前提。寧可多花 token,
 * 也不能讓「內容其實在文件裡卻沒被送給模型」變成靜默的資料遺失。
 */
export function slicePagesForRange(
  text: string,
  fromPage: number,
  toPage: number,
): IPageSliceResult {
  const pages = splitTextByPages(text);
  if (pages.length <= 1) {
    return { text, range: null, fellBack: true };
  }
  if (!Number.isFinite(fromPage) || !Number.isFinite(toPage)) {
    return { text, range: null, fellBack: true };
  }

  const from = Math.max(1, Math.floor(fromPage) - PDF_TEXT_PAGE_SLICE_PADDING);
  const to = Math.min(
    pages.length,
    Math.ceil(toPage) + PDF_TEXT_PAGE_SLICE_PADDING,
  );
  if (from > to) {
    return { text, range: null, fellBack: true };
  }

  // Info: (20260730 - Tzuhan) 保留頁標記:模型照抄時可一併帶出頁碼,人工查核能回原文對照
  const sliced = pages
    .slice(from - 1, to)
    .map((page, index) => `${page}\n-- p.${from + index}/${pages.length} --`)
    .join("");

  if (sliced.trim().length < PDF_TEXT_PAGE_SLICE_MIN_CHARS) {
    return { text, range: null, fellBack: true };
  }
  return { text: sliced, range: { from, to }, fellBack: false };
}
