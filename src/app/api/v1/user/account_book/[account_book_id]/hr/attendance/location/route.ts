import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { attendancePunchService } from "@/services/attendance_punch.service";

/**
 * Info: (20260813 - Julian) 打卡地點與圍欄清單。
 * GET /api/v1/user/account_book/:account_book_id/hr/attendance/location
 *
 * 前端用它在地圖上畫圓圈，並在打卡前就算出「距離 X 公尺、可否打卡」——
 * 讓使用者在按下按鈕之前就知道結果。**那是顯示用的估算，
 * 真正的判定一律在伺服器**（護欄 G2）：client 算出來的距離不參與任何決定。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260817 - Luphia) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId } = await params;
    // Info: (20260813 - Julian) 先解析員工身分：沒有員工檔的人不該看到工地座標
    await attendanceIdentityService.resolveEmployee(sessionUser, accountBookId);

    return jsonOk({
      locations: await attendancePunchService.listLocations(accountBookId),
    });
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] attendance location failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
