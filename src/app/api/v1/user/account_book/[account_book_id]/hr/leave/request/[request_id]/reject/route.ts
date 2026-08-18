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
 * Info: (20260817 - Julian) L15：駁回。
 * POST .../hr/leave/request/:request_id/reject
 *      body：`{ comment? }`
 *
 * **任一節點駁回即整張單駁回，額度完全不動** —— 因為送出時本來就沒預扣
 * （ADR 023 §6.2）。其餘尚未輪到的節點標 `SKIPPED` 而非留在 PENDING：
 * 留著會讓它們永遠出現在那些人的待辦清單裡。
 *
 * `comment` 不強制。強制填理由才能駁回，本身就是一種壓力 ——
 * 而該被記錄下來的是「誰在什麼時候駁回了」，那已經在簽核鏈快照上。
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
    const parsed = leaveDecisionSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId, request_id: requestId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveRequestService.reject({
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
    logger.error("[API] leave request reject failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
