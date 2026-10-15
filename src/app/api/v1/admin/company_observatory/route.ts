import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/admin_guard";
import { observatoryListQuerySchema } from "@/validators";
import { getObservatoryOverview } from "@/services/company_observatory/company_observatory.runtime";

/**
 * Info: (20261015 - Luphia) 企業觀測站的下載與索引狀態（管理端）。
 * GET /api/v1/admin/company_observatory?stockId=&source=&status=&year=&page=&pageSize=
 * 回傳各來源 × 狀態的筆數，以及符合條件的文件清單（含死信 DEAD 與最後錯誤）。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const parsed = observatoryListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    return jsonOk(await getObservatoryOverview(parsed.data));
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    console.error("[API] /admin/company_observatory error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
