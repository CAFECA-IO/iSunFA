import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { businessMonitorStockIdSchema } from "@/validators";
import { businessMonitorCompanyService } from "@/services/business_monitor_company.service";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20261022 - Luphia) 公司頁：基本資料、最新公司登記、依資料年度分組的報告庫
 * GET /api/v1/business_monitor/companies/:stock_id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stock_id: string }> },
) {
  const identity =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = enforceRateLimit(identity, RateLimitBucketEnum.READ);
  if (limited) return limited;

  const { stock_id: stockIdParam } = await params;
  const parsed = businessMonitorStockIdSchema.safeParse(stockIdParam);
  if (!parsed.success) return jsonFail(API_ERRORS.VL_INVALID_ID);

  try {
    const profile = await businessMonitorCompanyService.getCompanyProfile(
      parsed.data,
    );
    return jsonOk(profile);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error("business monitor company profile failed", {
      stockId: parsed.data,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
