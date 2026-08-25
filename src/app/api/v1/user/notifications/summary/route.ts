import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { getNotificationSummary } from "@/services/notification.service";

/**
 * Info: (20260821 - Luphia) 小鈴鐺的摘要（登入氣泡與 60 秒輪詢都打這一支）。
 * 只回兩個數字——輪詢端點要愈便宜愈好。
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260825 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      user.address,
      RateLimitBucketEnum.NOTIFICATION_READ,
    );
    if (limited) return limited;

    const summary = await getNotificationSummary({
      userId: user.id,
      address: user.address,
      nowMs: Date.now(),
    });
    return jsonOk(summary);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error("[API] notification summary failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
