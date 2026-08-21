import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
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
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
