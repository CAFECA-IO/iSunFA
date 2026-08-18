import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { attendancePresenceService } from "@/services/attendance_presence.service";

/**
 * Info: (20260813 - Julian) 現場人數總覽。
 * GET /api/v1/user/account_book/:account_book_id/hr/attendance/presence
 *
 * 各地點的在班／未打下班卡人數，加上全帳本的「未到工」名單。
 * **三個數字回答三個不同的問題**，缺一個就會讓看板暗示一個系統其實不知道的事實
 * （母文件 §D10.6）。
 *
 * 即時由 `AttendancePunch` 推導，不讀快取表（demo 計畫書 §4.3）。
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
    const viewer = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      // Info: (20260813 - Julian) 「現在」在這一層取一次往下注入；service 不呼叫 new Date()
      await attendancePresenceService.getSummary(
        accountBookId,
        new Date(),
        viewer.id,
      ),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] attendance presence failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
