import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import {
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_PAGE_SIZE_MAX,
} from "@/constants/notification";
import { listNotificationHistory } from "@/services/notification.service";

/**
 * Info: (20260826 - Julian) GET /api/v1/user/notifications/history?page=1&limit=20
 *
 * `/user/notifications` 頁面的歷史區。與鈴鐺那支（`../notifications`）分開，
 * 因為兩者要的東西不同：鈴鐺只要最新的一批、每 60 秒問一次；頁面要能翻頁，
 * 因此需要一次 `count()`。合在一起的話，鈴鐺的輪詢會替頁面付那次查詢。
 *
 * 只回**事件型**歷史。待辦型（邀請、錢包升級）是活算的狀態、天然有限，
 * 由鈴鐺那支端點提供，頁面兩區各自去要。
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260826 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      user.address,
      RateLimitBucketEnum.NOTIFICATION_READ,
    );
    if (limited) return limited;

    /**
     * Info: (20260826 - Julian) 走共用的 `parsePositiveInt`，不要自己 parseInt。
     * `?limit=abc` 用 `parseInt` 會得到 NaN，一路傳到 Prisma 的 `take` 就是 500——
     * 使用者打錯一個字元不該讓端點爆炸（見那支函式的說明）。
     */
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), { fallback: 1 });
    const limit = parsePositiveInt(searchParams.get("limit"), {
      fallback: NOTIFICATION_PAGE_SIZE,
      max: NOTIFICATION_PAGE_SIZE_MAX,
    });

    const history = await listNotificationHistory({
      userId: user.id,
      page,
      limit,
    });
    return jsonOk(history);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error("[API] notification history failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
