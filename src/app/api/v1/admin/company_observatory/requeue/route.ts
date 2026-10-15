import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/admin_guard";
import { observatoryRequeueSchema } from "@/validators";
import { requeueObservatoryDocuments } from "@/services/company_observatory/company_observatory.runtime";

/**
 * Info: (20261015 - Luphia) 把死信（DEAD）重新排入下載（管理端）。
 * POST /api/v1/admin/company_observatory/requeue
 * body: `{ "ids": ["uuid", ...] }` 或 `{ "allDead": true, "source"?: "ESG_REPORT" }`
 * 只會動 DEAD 的文件，重試次數歸零；回傳實際排入的筆數。
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonFail(API_ERRORS.VL_INVALID_JSON);
    }
    const parsed = observatoryRequeueSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    return jsonOk(await requeueObservatoryDocuments(parsed.data));
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    console.error("[API] /admin/company_observatory/requeue error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
