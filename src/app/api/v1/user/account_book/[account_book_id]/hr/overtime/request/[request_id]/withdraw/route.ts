import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { overtimeWithdrawSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { overtimeRequestService } from "@/services/overtime_request.service";

/**
 * Info: (20260818 - Julian) 申請人撤回自己尚未決行的加班單。
 * POST /api/v1/user/account_book/[account_book_id]/hr/overtime/request/[request_id]/withdraw
 *      body：`{ reason?: string }`
 *
 * **只有申請人自己，且只在 PENDING。** 主管要讓一張單消失，正確的動作是駁回
 * （L27）—— 那會留下他的名字與時點。
 *
 * 事後補單的撤回**必須填理由**：那是收回一句對已發生事實的陳述，而收回的方向
 * 對雇主有利。事前申請不必填。判斷在 service，因為它要知道這張單的 `filingType`。
 *
 * 用 POST 而不是 DELETE：與 approve／reject 同一種形狀，而且它要收 body。
 * 撤回也不是刪除 —— 那一列會留著，狀態改為 `WITHDRAWN`。
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

    const body = await request.json().catch(() => ({}));
    const parsed = overtimeWithdrawSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId, request_id: requestId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await overtimeRequestService.withdraw({
        accountBookId,
        requestId,
        actorEmployeeId: actor.id,
        reason: parsed.data.reason,
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
    logger.error("[API] overtime request withdraw failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
