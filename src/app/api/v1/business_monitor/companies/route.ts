import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { businessMonitorCompanyListSchema } from "@/validators";
import { businessMonitorCompanyService } from "@/services/business_monitor_company.service";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20261022 - Luphia) 公司搜尋與依產業瀏覽
 * GET /api/v1/business_monitor/companies?q={名稱／簡稱／代號／統編}&industry={產業代碼}&page=&pageSize=
 */
export async function GET(request: NextRequest) {
  const identity =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = enforceRateLimit(identity, RateLimitBucketEnum.READ);
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const parsed = businessMonitorCompanyListSchema.safeParse({
    q: params.get("q") || undefined,
    industry: params.get("industry") || undefined,
    page: params.get("page") || undefined,
    pageSize: params.get("pageSize") || undefined,
  });
  if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);

  try {
    const result = await businessMonitorCompanyService.listCompanies(
      parsed.data,
    );
    return jsonOk(result);
  } catch (error) {
    logger.error("business monitor companies failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
