// Info: (20260731 - Tzuhan) 運輸報告向量列印端點:純端口(驗證 → Service → 格式化回應),不含業務邏輯
// Info: (20260731 - Tzuhan) 動機見 issue 07:前端光柵化的 PDF 開了壓縮仍 500 KB,
// Info: (20260731 - Tzuhan) 一頁 A4 文字在可讀 DPI 下就是 60~150 KB,那是編碼下限。
// Info: (20260731 - Tzuhan) 改由 Chrome 列印向量文字,同時讓 PDF 內文字可選取、可搜尋 —— 審計文件的實質升級。
// Info: (20260731 - Tzuhan) 與計算器主端點同樣不需登入(公開落地頁功能),因此以載荷上限與筆數上限節流,
// Info: (20260731 - Tzuhan) 而非以身分節流:每份報告都要跑一次 Chrome 排版,無上限的批次即是資源耗盡的入口。

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { LogisticsReportPdfService } from "@/services/logistics_report_pdf.service";
import { LogisticsReportPdfRequestSchema } from "@/validators";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail(API_ERRORS.VL_INVALID_JSON);
  }

  const parsed = LogisticsReportPdfRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
  }

  try {
    const service = new LogisticsReportPdfService();
    const files = await service.generate(parsed.data);
    // Info: (20260731 - Tzuhan) 回傳實際位元組數:前端據此判斷是否超出體積預算並警告,
    // Info: (20260731 - Tzuhan) 量測留在同一條路徑上,不讓體積再次變成沒人看的指標
    return jsonOk({ files });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error(
      // Info: (20260731 - Tzuhan) 不用 JSON.stringify:對 Error 實例永遠印出 {},出事時等於沒有線索
      `[API] /transportation_carbon_footprint_calculator/report_pdf POST error: ${
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error)
      }`,
    );
    return jsonFail(API_ERRORS.IS_PDF_GENERATION_FAILED);
  }
}
