// Info: (20260724 - Tzuhan) PDF 匯出共用工具:DOM 元素截圖 → 分頁 PDF blob 與語意化檔名
// Info: (20260724 - Tzuhan) 從 page.tsx handleDownloadPDF 抽出,單筆與批次匯出共用,消除三段複製貼上的截圖邏輯

import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import {
  EXPORT_PLAN_FILE_SUFFIX,
  ExportPlanRouteType,
  buildPlanCode,
  PDF_EXPORT_IMAGE_QUALITY,
  PDF_EXPORT_PIXEL_RATIO,
  PDF_EXPORT_SIZE_BUDGET_BYTES,
} from "@/constants/logistics";

/**
 * Info: (20260724 - Tzuhan) 將 DOM 元素截圖並轉為 A4 直式 PDF(內容過高時自動分頁)
 * 截圖前的 WebGL/viewport workaround 由呼叫端負責
 *
 * Info: (20260731 - Tzuhan) `compress: true` 不是最佳化,是正確性:
 * jsPDF 會把 PNG 解碼後寫入影像串流,未開壓縮即等於逐像素原始 RGB ——
 * 1600×4800 就是 23,040,000 bytes(22.5 MB),這正是匯出檔案超過 20 MB 的原因。
 * 開啟後同一張圖實測 22,504 KB → 138 KB(壓縮後 PDF 大小約等於來源 PNG 大小)。
 * 影像格式維持 PNG:報告是白底 + 文字 + 地圖,無損壓縮遠優於 JPEG(q70 實測 1,198 KB)。
 */
export async function captureElementToPdf(
  element: HTMLElement,
): Promise<jsPDF> {
  const dataUrl = await htmlToImage.toPng(element, {
    quality: PDF_EXPORT_IMAGE_QUALITY,
    pixelRatio: PDF_EXPORT_PIXEL_RATIO,
    // Info: (20260731 - Tzuhan) 明確補白底:PNG 保留透明區,若元素本身無背景色,
    // Info: (20260731 - Tzuhan) 透明像素在 PDF 檢視器上的呈現不一致(原 JPEG 路徑即已指定白底)
    backgroundColor: "#ffffff",
    style: { margin: "0", transform: "none" },
  });

  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
  });
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
 * Info: (20260731 - Tzuhan) 產出 blob 並量測體積。所有匯出路徑一律經此,不各自呼叫 pdf.output("blob"),
 * 否則體積回歸又會沒有任何人在看 —— 這個 bug 能長到 22.5 MB 正是因為沒有東西在量。
 *
 * 超出預算只警告不阻擋:使用者要的是報告,不是我們的品質標準。
 * 回傳實際位元組數供呼叫端彙總(批次匯出可據此判斷 zip 是否過大)。
 */
export function pdfToBlob(
  pdf: jsPDF,
  fileName: string,
): { blob: Blob; sizeBytes: number } {
  const blob = pdf.output("blob") as Blob;
  if (blob.size > PDF_EXPORT_SIZE_BUDGET_BYTES) {
    // Info: (20260731 - Tzuhan) 印出實際值與預算,才能直接判斷該調 pixelRatio 還是要走向量化
    console.warn(
      `[pdfExport] ${fileName} 為 ${Math.round(blob.size / 1024)} KB,超出預算 ${Math.round(
        PDF_EXPORT_SIZE_BUDGET_BYTES / 1024,
      )} KB(截圖 pixelRatio=${PDF_EXPORT_PIXEL_RATIO})`,
    );
  }
  return { blob, sizeBytes: blob.size };
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
