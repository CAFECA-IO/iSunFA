import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { overtimeRequestService } from "@/services/overtime_request.service";

/**
 * Info: (20260818 - Julian) L27：駁回加班單。
 * POST /api/v1/user/account_book/[account_book_id]/hr/overtime/request/:request_id/reject
 *
 * 沒有 body：與假單的駁回不同，這裡不強制填理由。加班單被駁回的常見原因是
 * 「這個時段不需要人留下來」，那是排程決定而不是對申請人的評價 ——
 * 而強制填理由才能駁回，本身就是一種壓力（同 `leaveDecisionSchema` 對
 * `comment` 不強制的理由）。
 * ToDo: (20260818 - Julian) 加班單目前沒有 `comment` 欄位可存，
 * 要留下駁回說明須先加欄位；列在 L24–L30 收尾時一併評估。
 *
 * 決行者的判斷與核准完全相同 —— 不得自我核准、必須管得到這個人。
 * 「可以核准但不能駁回」會讓主管把不想核准的單子放著不動，
 * 而放著不動的單子沒有任何期限。
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; request_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260818 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.LEAVE_WRITE,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId, request_id: requestId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await overtimeRequestService.reject({
        accountBookId,
        requestId,
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
    logger.error("[API] overtime request reject failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
