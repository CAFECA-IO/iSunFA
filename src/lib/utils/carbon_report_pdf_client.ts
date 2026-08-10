import { request } from "@/lib/utils/request";
import type { IApiResponse } from "@/lib/utils/response";
import { base64ToBytes } from "@/lib/utils/logistics_report_client";

/**
 * Info: (20260810 - Emily) 向伺服端要一份向量列印的碳盤查報告
 * (data/issue_drafts/inventory_table_import/17)。
 *
 * base64 包在 JSON 而非直接回二進位:與 logistics 的 report_pdf 同一種形狀,
 * 讓兩條列印路徑的用戶端處理方式一致(共用 base64ToBytes)。
 */
export const CARBON_PDF_API_PATH = "/api/v1/carbon/report_pdf";

export interface ICarbonPdfResult {
  blob: Blob;
  sizeBytes: number;
  landscapeTables: number;
  chartsRendered: number;
  chartsFailed: number;
}

interface ICarbonPdfPayload {
  file: {
    fileName: string;
    contentBase64: string;
    sizeBytes: number;
    landscapeTables: number;
    chartsRendered: number;
    chartsFailed: number;
  };
}

export const requestCarbonReportPdf = async (params: {
  markdown: string;
  fileName: string;
  title?: string;
}): Promise<ICarbonPdfResult> => {
  /*
   * Info: (20260810 - Emily) request() 回的是整個信封而不是 payload,
   * body 要自己 JSON.stringify —— 它只負責帶上 Authorization 與 Content-Type。
   */
  const envelope = await request<IApiResponse<ICarbonPdfPayload>>(
    CARBON_PDF_API_PATH,
    { method: "POST", body: JSON.stringify(params) },
  );
  const file = envelope?.payload?.file;
  if (!file?.contentBase64) {
    throw new Error("carbon report pdf response missing payload");
  }
  return {
    blob: new Blob([base64ToBytes(file.contentBase64)], {
      type: "application/pdf",
    }),
    sizeBytes: file.sizeBytes,
    landscapeTables: file.landscapeTables,
    chartsRendered: file.chartsRendered,
    chartsFailed: file.chartsFailed,
  };
};

/** Info: (20260810 - Emily) 觸發瀏覽器下載;URL 用完即撤,否則整份 PDF 會留在記憶體 */
export const saveBlobAs = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
