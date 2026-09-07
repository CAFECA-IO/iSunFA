import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { leaveDecisionSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveRequestService } from "@/services/leave_request.service";

/**
 * Info: (20260817 - Julian) L14：核准當前節點。
 * POST /api/v1/user/account_book/[account_book_id]/hr/leave/request/:request_id/approve
 *      body：`{ comment? }`
 *
 * ## 這一支是本模組風險最高的端點
 *
 * 若本關是最後一關，**扣額度、投影排班、改單據狀態會在同一個交易內完成**
 * （ADR 023 §6）。中間節點則只把「當前待簽」交給下一關，一分鐘都不扣。
 *
 * 四條職責分離規則（ADR 023 §5）由 service 依序套用：
 * 不得自我核准 → 非當前簽核節點不得代簽 → 已決之單不得再改 →
 * 節點解析出申請人本人時自動上升（不 throw，老闆也要能請假）。
 *
 * ## 兩種「不是故障」的失敗
 *
 * `CF_LEAVE_BALANCE_RACE`（額度被另一張單先扣走）與
 * `VA_LEAVE_ALREADY_REVIEWED`（這一關已被另一個分頁簽掉）都是併發下的
 * 正常結局。分成兩個代碼是因為呼叫端要給出不同的訊息。
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

    /**
     * Info: (20260817 - Julian) body 可以整個省略（核准通常不附意見），
     * 但空的 body 會讓 `request.json()` 丟例外 —— 那不是錯誤，是常態。
     */
    const body = await request.json().catch(() => ({}));
    const parsed = leaveDecisionSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId, request_id: requestId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveRequestService.approve({
        accountBookId,
        requestId,
        actorEmployeeId: actor.id,
        comment: parsed.data.comment,
        observedAt: new Date(),
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
    logger.error("[API] leave request approve failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
