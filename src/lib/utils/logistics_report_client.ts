// Info: (20260731 - Tzuhan) 匯出的前端客戶端:呼叫伺服端列印 API、分批、解碼成 Blob(issue 08 步驟二)
// Info: (20260731 - Tzuhan) 與 page.tsx 分離的理由:page.tsx 的匯出流程已有 250 行 DOM 操作,
// Info: (20260731 - Tzuhan) 再把請求與解碼混進去會更難改;而 base64 解碼是可以獨立測試的純邏輯。

import {
  LOGISTICS_PDF_REQUEST_BATCH_SIZE,
  LOGISTICS_PDF_MAP_MAX_BYTES,
} from "@/constants/logistics_pdf";
import { chunkReportItems } from "@/lib/utils/logistics_report_request";
import type { ILogisticsReportPdfItem } from "@/validators";

export const LOGISTICS_PDF_API_PATH =
  "/api/v1/transportation_carbon_footprint_calculator/report_pdf";

export interface IExportedPdf {
  fileName: string;
  blob: Blob;
  sizeBytes: number;
}

interface IApiFile {
  fileName: string;
  planCode: string;
  contentBase64: string;
  sizeBytes: number;
}

/**
 * Info: (20260731 - Tzuhan) base64 → 位元組。純邏輯,不依賴 DOM,故可被單元測試。
 * 逐字元轉換而非 fetch(dataURL):後者是非同步且在部分瀏覽器對大字串較慢。
 */
export function base64ToBytes(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  // Info: (20260731 - Tzuhan) 回傳 ArrayBuffer 而非 Uint8Array:後者在 TS 5.7+ 帶
  // Info: (20260731 - Tzuhan) ArrayBufferLike 泛型參數,不符 BlobPart 的型別要求
  return bytes.buffer;
}

/**
 * Info: (20260731 - Tzuhan) 地圖影像若超過上限,**在前端就丟掉**而不是送出去讓伺服端拒絕:
 * 省下的是白花的頻寬(27 份 × 過大的圖可以是好幾 MB)。伺服端仍會複驗,這裡只是提前收斂。
 */
export function dropOversizedMapImage(
  item: ILogisticsReportPdfItem,
): ILogisticsReportPdfItem {
  if (!item.mapImageDataUrl) return item;
  const base64 = item.mapImageDataUrl.slice(
    item.mapImageDataUrl.indexOf(",") + 1,
  );
  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes <= LOGISTICS_PDF_MAP_MAX_BYTES) return item;
  return { ...item, mapImageDataUrl: undefined };
}

export interface IRequestReportPdfsOptions {
  exportId?: string;
  /** Info: (20260731 - Tzuhan) 每完成一批回報進度,供進度條更新(分批的主要目的之一) */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Info: (20260731 - Tzuhan) 分批請求並回傳可直接下載/打包的 Blob。
 * 任一批失敗即整體拋錯:交付「27 份裡少了 3 份」而使用者不知道少了哪些,比明確失敗更糟。
 */
export async function requestReportPdfs(
  items: ILogisticsReportPdfItem[],
  options: IRequestReportPdfsOptions = {},
): Promise<IExportedPdf[]> {
  const prepared = items.map(dropOversizedMapImage);
  const batches = chunkReportItems(prepared, LOGISTICS_PDF_REQUEST_BATCH_SIZE);
  const results: IExportedPdf[] = [];

  for (const batch of batches) {
    const response = await fetch(LOGISTICS_PDF_API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reports: batch, exportId: options.exportId }),
    });
    if (!response.ok) {
      throw new Error(`PDF export failed with HTTP ${response.status}`);
    }
    const json: { success?: boolean; payload?: { files?: IApiFile[] } } =
      await response.json();
    const files = json.payload?.files;
    if (!json.success || !files) {
      throw new Error("PDF export response missing payload");
    }
    files.forEach((file) => {
      results.push({
        fileName: file.fileName,
        blob: new Blob([base64ToBytes(file.contentBase64)], {
          type: "application/pdf",
        }),
        sizeBytes: file.sizeBytes,
      });
    });
    options.onProgress?.(results.length, prepared.length);
  }

  return results;
}
