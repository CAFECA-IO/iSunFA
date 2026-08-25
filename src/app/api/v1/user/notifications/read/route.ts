import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { markNotificationsRead } from "@/services/notification.service";

/**
 * Info: (20260821 - Luphia) 打開鈴鐺＝看過了：事件型全部標已讀。
 * 沒有 body（一律全讀）——逐 id 已讀會讓截斷在清單之外的通知永遠未讀，
 * 而「部分已讀」對這個鈴鐺沒有對應的使用情境。
 *
 * Info: (20260825 - Julian) **請求主體一律忽略，而且是刻意的。**
 *
 * 這支端點不讀 body，所以送 `{ userId: "someone-else" }` 不會有任何效果 ——
 * 收件人恆為 session 身分。寫下來是因為「靜默接受任意 body」與
 * 「明確忽略 body」在行為上一樣、在意圖上不一樣，而下一個人會想加參數。
 * 真的需要參數時要走 `src/validators/`，不要在這裡直接讀 `request.json()`。
 *
 * Info: (20260825 - Julian) 待辦型不在標記範圍內（見 markNotificationsRead）。
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260825 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      user.address,
      RateLimitBucketEnum.NOTIFICATION_WRITE,
    );
    if (limited) return limited;

    const count = await markNotificationsRead({
      userId: user.id,
      nowMs: Date.now(),
    });
    return jsonOk({ read: count });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error("[API] notification read failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
