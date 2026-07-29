// Info: (20260724 - Tzuhan) PDF 匯出共用工具:DOM 元素截圖 → 分頁 PDF blob 與語意化檔名
// Info: (20260724 - Tzuhan) 從 page.tsx handleDownloadPDF 抽出,單筆與批次匯出共用,消除三段複製貼上的截圖邏輯

import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import {
  EXPORT_PLAN_FILE_SUFFIX,
  ExportPlanRouteType,
  buildPlanCode,
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
 * Info: (20260729 - Tzuhan) 匯出批次識別碼:同一次匯出的所有 PDF 與 summary.csv 共用,
 * 使跨批次的同名方案代碼(如兩次匯出都有 R01-SEA)仍可區分
 */
export function buildExportId(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/**
 * Info: (20260724 - Tzuhan) 語意化匯出檔名:{方案代碼}_{origin}-{dest}_{plan_type}.pdf
 * Info: (20260729 - Tzuhan) 檔名以方案代碼(R01-SEA)開頭,與 PDF 標頭及 CSV 的 Plan Code 欄一致,
 * Info: (20260729 - Tzuhan) 使用者不需開檔即可辨識「哪條路線的哪個方案」並回查 CSV
 */
export function buildExportFileName(
  routeIndex: number,
  planType: ExportPlanRouteType,
  origin?: string,
  dest?: string,
): string {
  const codePart = buildPlanCode(routeIndex, planType);
  const originPart = origin ? sanitizeFileNamePart(origin) : "";
  const destPart = dest ? sanitizeFileNamePart(dest) : "";
  const locationPart =
    originPart && destPart ? `_${originPart}-${destPart}` : "";
  return `${codePart}${locationPart}_${EXPORT_PLAN_FILE_SUFFIX[planType]}.pdf`;
}
