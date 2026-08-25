import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveRequestService } from "@/services/leave_request.service";

/**
 * Info: (20260817 - Julian) L16：待我簽核。
 * GET /api/v1/user/account_book/[account_book_id]/hr/leave/request/pending
 *
 * 只回「當前待簽的那一關是我」的單。排在第二關的人在第一關通過之前
 * 不該看到它 —— 否則他會去簽一張還沒輪到他的單，然後收到一個
 * 他看不懂的 403。判準是 `pendingKey` 而不是 `status = PENDING`，
 * 因為只有前者有唯一約束保護（ADR 023 §4）。
 *
 * 不收任何參數：待辦清單就是待辦清單，加上篩選只會讓人漏看。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260818 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveRequestService.listPending({
        accountBookId,
        actorEmployeeId: actor.id,
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] leave pending list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
