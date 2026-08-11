import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { CarbonReportPdfService } from "@/services/carbon_report_pdf.service";
import { CarbonReportPdfRequestSchema } from "@/validators";

/**
 * Info: (20260810 - Emily) 碳盤查報告的伺服端向量列印
 * (data/issue_drafts/inventory_table_import/17)。
 *
 * 與 logistics 的 report_pdf 不同,這條**需要登入**:
 * 那條是登陸頁的公開功能、以載荷大小節流;這條處理的是使用者自己的盤查報告草稿。
 *
 * maxDuration 明確設定而非沿用預設:這條會啟動 Chrome 排版一份上百頁的文件,
 * 實測冷啟動加列印約 5~10 秒,而平台預設的逾時通常更短 ——
 * 逾時的表現是「下載沒有反應」,與失敗完全同形。
 */
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const sessionUser = await getIdentityFromDeWT(
    request.headers.get("Authorization"),
  );
  if (!sessionUser) {
    return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail(API_ERRORS.VL_INVALID_JSON);
  }

  const parsed = CarbonReportPdfRequestSchema.safeParse(body);
  if (!parsed.success) {
    // Info: (20260810 - Emily) 只記路徑與代碼,不記值 —— 載荷是使用者的報告內容
    logger.warn("[API] carbon report_pdf schema rejected", {
      issues: parsed.error.issues.slice(0, 10).map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    });
    return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
  }

  try {
    const service = new CarbonReportPdfService();
    const file = await service.generate(parsed.data);
    return jsonOk({ file });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error(
      `[API] /carbon/report_pdf POST error: ${
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error)
      }`,
    );
    return jsonFail(API_ERRORS.IS_PDF_GENERATION_FAILED);
  }
}
