import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { markNotificationRead } from "@/services/notification.service";

/**
 * Info: (20260825 - Julian) 把**單獨一則**通知標為已讀（點哪則收哪則）。
 *
 * 面板現在會留著已讀的通知讓人翻歷史，未讀靠一顆紅點區分 ——
 * 所以「已讀」的觸發點從「打開鈴鐺」改成「點擊那一則」。
 * 打開就全讀的話，紅點在使用者看清楚之前就全滅了。
 *
 * ## 這支端點的輸入是使用者送來的 id，所以三件事都在 service／repo 層擋
 *
 * - 收件人恆為 session 身分：`userId` 取自 DeWT，**不讀 body**
 * - 通知必須屬於這個 userId（`markReadById` 的 where 帶 userId）
 * - 待辦型排除（計畫書 D1）：否則湊出一個 id 就能收掉錢包升級待辦，
 *   而 `dedupeKey` 是永久唯一鍵，收掉補不回來
 *
 * ## 為什麼「標記不到」不是錯誤
 *
 * 回 `{ read: false }` 而不是 404：不存在、不是你的、已經讀過、是待辦型 ——
 * 四種情況對呼叫端的處置完全一樣（把紅點拿掉、徽章不動）。
 * 用 404 分辨得出「這個 id 存不存在」，而那正好是不該讓外部探測的事。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notification_id: string }> },
) {
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

    const { notification_id: notificationId } = await params;

    const read = await markNotificationRead({
      userId: user.id,
      notificationId,
      nowMs: Date.now(),
    });
    return jsonOk({ read });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error("[API] notification read-one failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
