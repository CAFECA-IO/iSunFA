// Info: (20260724 - Tzuhan) PDF 匯出共用工具:DOM 元素截圖 → 分頁 PDF blob 與語意化檔名
// Info: (20260724 - Tzuhan) 從 page.tsx handleDownloadPDF 抽出,單筆與批次匯出共用,消除三段複製貼上的截圖邏輯

import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import {
  EXPORT_PLAN_FILE_SUFFIX,
  ExportPlanRouteType,
} from "@/constants/logistics";

/**
 * Info: (20260724 - Tzuhan) 將 DOM 元素截圖並轉為 A4 直式 PDF(內容過高時自動分頁)
 * 沿用既有參數(pixelRatio 2 / quality 0.95),截圖前的 WebGL/viewport workaround 由呼叫端負責
 */
export async function captureElementToPdf(
  element: HTMLElement,
): Promise<jsPDF> {
  const dataUrl = await htmlToImage.toPng(element, {
    quality: 0.95,
    pixelRatio: 2,
    style: { margin: "0", transform: "none" },
  });

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(dataUrl);
  const imgHeightInMm = (imgProps.height * pdfWidth) / imgProps.width;

  let heightLeft = imgHeightInMm;
  let position = 0;

  pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeightInMm);
  heightLeft -= pdfHeight;

  // Info: (20260502 - Luphia) 避免浮點數誤差或 1 毫米的溢白邊產生無意義的整面空白頁
  while (heightLeft > 1) {
    position -= pdfHeight;
    pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, imgHeightInMm);
    heightLeft -= pdfHeight;
  }

  return pdf;
}

/**
 * Info: (20260724 - Tzuhan) 檔名安全化:僅保留字母數字與 CJK,其餘轉為連字號,避免特殊字元造成檔案系統問題
 */
export function sanitizeFileNamePart(part: string, maxLength = 30): string {
  return part
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

/**
 * Info: (20260724 - Tzuhan) 語意化匯出檔名:route_{n}_{origin}-{dest}_{plan_type}.pdf
 * 一份 PDF 一個方案(需求二),使用者不需開檔即可辨識內容
 */
export function buildExportFileName(
  routeIndex: number,
  planType: ExportPlanRouteType,
  origin?: string,
  dest?: string,
): string {
  const routePart = `route_${routeIndex + 1}`;
  const originPart = origin ? sanitizeFileNamePart(origin) : "";
  const destPart = dest ? sanitizeFileNamePart(dest) : "";
  const locationPart =
    originPart && destPart ? `_${originPart}-${destPart}` : "";
  return `${routePart}${locationPart}_${EXPORT_PLAN_FILE_SUFFIX[planType]}.pdf`;
}
