import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { businessMonitorCompanyService } from "@/services/business_monitor_company.service";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20261022 - Luphia) 依產業瀏覽：產業清單與各產業追蹤中的公司數
 * GET /api/v1/business_monitor/industries
 */
export async function GET(request: NextRequest) {
  const identity =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = enforceRateLimit(identity, RateLimitBucketEnum.READ);
  if (limited) return limited;

  try {
    const industries = await businessMonitorCompanyService.listIndustries();
    return jsonOk({ industries });
  } catch (error) {
    logger.error("business monitor industries failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
