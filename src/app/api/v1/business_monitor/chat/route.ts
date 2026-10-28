import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { businessMonitorChatSchema } from "@/validators";
import { businessMonitorService } from "@/services/business_monitor.service";
import { toBillingFailureResponse } from "@/lib/utils/billing_response";
import { logger } from "@/lib/utils/logger";
import { isFeatureEnabled } from "@/services/feature_flag.service";
import { FEATURE_FLAG } from "@/constants/feature_flag";

/**
 * Info: (20260610 - Julian) AI 諮詢功能
 * POST /api/v1/business_monitor/chat
 *
 * Info: (20261022 - Luphia) 純端口：授權 → 限流 → 驗證 → 呼叫 Service → 格式化回應。
 * AI 諮詢需登入並扣額度（產品拍板 20261022）；未登入回 AUTH_INVALID_TOKEN，
 * 額度不足或需個人付款回結構化 402，前端據此付款後以同一個 clientMessageId 重送。
 */
export const POST = async (request: NextRequest) => {
  // Info: (20261028 - Luphia) 企業觀測站預設隱藏：後台未開啟時對外就是沒有這支 API
  if (!(await isFeatureEnabled(FEATURE_FLAG.BUSINESS_MONITOR))) {
    return jsonFail(API_ERRORS.NF_FEATURE_DISABLED);
  }
  const sessionUser = await getIdentityFromDeWT(
    request.headers.get("Authorization"),
  );
  if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

  const limited = enforceRateLimit(
    sessionUser.address,
    RateLimitBucketEnum.LLM,
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail(API_ERRORS.VL_INVALID_JSON);
  }

  const parsed = businessMonitorChatSchema.safeParse(body);
  if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);

  try {
    const result = await businessMonitorService.chat({
      userId: sessionUser.id,
      question: parsed.data.question,
      clientMessageId: parsed.data.clientMessageId,
      scope: parsed.data.scope,
    });
    return jsonOk(result);
  } catch (error) {
    const billingFailure = toBillingFailureResponse(error);
    if (billingFailure) return billingFailure;
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error("business monitor chat failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
};
