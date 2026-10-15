import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/admin_guard";
import { observatorySearchQuerySchema } from "@/validators";
import { ObservatoryInfraUnavailableError } from "@/lib/company_observatory/errors";
import { searchObservatory } from "@/services/company_observatory/company_observatory.runtime";

/**
 * Info: (20261015 - Luphia) 企業觀測站向量檢索（管理端）。
 * GET /api/v1/admin/company_observatory/search?q=&stockId=&source=&year=&limit=
 * 依公司代號、報告類型、年度過濾後做相似度檢索，回傳切塊原文與來源 URL、頁碼。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const parsed = observatorySearchQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    const { q, stockId, source, year, limit } = parsed.data;
    const hits = await searchObservatory({
      query: q,
      filter: { stockId, source, year },
      limit,
    });
    return jsonOk({ hits });
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    if (error instanceof ObservatoryInfraUnavailableError) {
      return jsonFail(API_ERRORS.IS_OBSERVATORY_INDEX_UNAVAILABLE);
    }
    console.error("[API] /admin/company_observatory/search error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
