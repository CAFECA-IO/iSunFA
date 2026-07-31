// Info: (20260730 - Tzuhan) 文字層品質閘門測試:門檻皆以四份真實報告的實測值為基準
import { describe, it, expect } from "@jest/globals";
import {
  assessPdfTextLayer,
  measurePdfTextLayer,
  PDF_TEXT_LAYER_REASON,
} from "@/lib/pdf_text_layer";
import { PdfTextLayerDecisionEnum } from "@/constants/pdf_text_layer";

const CLEAN_LINE =
  "溫室氣體排放總量為 12345.67 公噸二氧化碳當量，範疇一佔比 42%。";

/** Info: (20260730 - Tzuhan) 造出指定頁數、指定每頁字數的乾淨文字層 */
function buildCleanText(pages: number, charsPerPage: number): string {
  const perPage = CLEAN_LINE.repeat(
    Math.ceil(charsPerPage / CLEAN_LINE.length),
  ).slice(0, charsPerPage);
  return perPage.repeat(pages);
}

describe("measurePdfTextLayer", () => {
  it("統計字數、每頁字數與解碼失敗字元", () => {
    const quality = measurePdfTextLayer("abc�def", 2);
    expect(quality.chars).toBe(7);
    expect(quality.pages).toBe(2);
    expect(quality.charsPerPage).toBe(4);
    expect(quality.undecodedChars).toBe(1);
  });

  it("頁數為 0 時不除以零", () => {
    const quality = measurePdfTextLayer("abc", 0);
    expect(quality.pages).toBe(1);
    expect(quality.charsPerPage).toBe(3);
  });

  it("辨識緊鄰數字的解碼失敗(世德那份的失真型態)", () => {
    // Info: (20260730 - Tzuhan) 實測原文「民國113年」被抽成「民國���年」——失真正好落在數字上
    const quality = measurePdfTextLayer("民國���年營收成長", 1);
    expect(quality.undecodedChars).toBe(3);
    expect(quality.numericUndecodedChars).toBe(3);
  });

  it("純文字區域的解碼失敗不計為數值失真", () => {
    const quality = measurePdfTextLayer("本公司致力於�續發展與環境保護", 1);
    expect(quality.undecodedChars).toBe(1);
    expect(quality.numericUndecodedChars).toBe(0);
  });
});

describe("assessPdfTextLayer", () => {
  it("乾淨文字層走純文字路徑(高興昌盤查報告 888 字/頁、失敗 0)", () => {
    const result = assessPdfTextLayer(buildCleanText(64, 888), 64, true);
    expect(result.decision).toBe(PdfTextLayerDecisionEnum.TEXT);
    expect(result.reason).toBe(PDF_TEXT_LAYER_REASON.CLEAN);
    expect(result.quality.charsPerPage).toBe(888);
  });

  it("掃描件(幾乎無文字層)退回視覺模型", () => {
    const result = assessPdfTextLayer(buildCleanText(50, 20), 50, true);
    expect(result.decision).toBe(PdfTextLayerDecisionEnum.VISION);
    expect(result.reason).toBe(PDF_TEXT_LAYER_REASON.TOO_SPARSE);
  });

  it("數字被解成替換字元時退回視覺模型,即使整體失敗率極低", () => {
    // Info: (20260730 - Tzuhan) 一個落在數字上的失真就足以讓排放量不可信,故零容忍
    const result = assessPdfTextLayer(
      `${buildCleanText(60, 900)}民國�年`,
      60,
      true,
    );
    expect(result.quality.undecodedRatio).toBeLessThan(0.002);
    expect(result.decision).toBe(PdfTextLayerDecisionEnum.VISION);
    expect(result.reason).toBe(PDF_TEXT_LAYER_REASON.UNDECODED_NUMERIC);
  });

  it("非數值區的解碼失敗率超標時退回視覺模型", () => {
    const noisy = `${buildCleanText(10, 500)}${"永�續".repeat(40)}`;
    const result = assessPdfTextLayer(noisy, 10, true);
    expect(result.quality.numericUndecodedChars).toBe(0);
    expect(result.decision).toBe(PdfTextLayerDecisionEnum.VISION);
    expect(result.reason).toBe(PDF_TEXT_LAYER_REASON.UNDECODED_RATIO);
  });

  it("文字層不可信且原檔過大無法走視覺模型時明確拒絕,不放行失真數據", () => {
    const result = assessPdfTextLayer(buildCleanText(50, 20), 50, false);
    expect(result.decision).toBe(PdfTextLayerDecisionEnum.REJECT);
    expect(result.reason).toBe(PDF_TEXT_LAYER_REASON.NO_VISION_FALLBACK);
  });

  it("空白文字層視為無文字層", () => {
    const result = assessPdfTextLayer("", 30, true);
    expect(result.quality.undecodedRatio).toBe(1);
    expect(result.decision).toBe(PdfTextLayerDecisionEnum.VISION);
  });
});
