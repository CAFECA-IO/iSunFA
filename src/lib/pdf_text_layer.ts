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
      const result = await parser.getText();
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
