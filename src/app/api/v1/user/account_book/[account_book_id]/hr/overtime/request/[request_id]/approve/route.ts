import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { overtimeApprovalSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { overtimeRequestService } from "@/services/overtime_request.service";

/**
 * Info: (20260818 - Julian) L26：核准加班單，**同時決定認列分鐘與分段**。
 * POST .../hr/overtime/request/:request_id/approve
 *      body：`{ approvedMinutes? }`（省略即照申請的整段核准）
 *
 * ## 這一支是加班模組風險最高的端點
 *
 * 一個交易內完成四件事：改狀態、寫入加成分段、換補休（或產折現事件）、
 * 更新餘額快取。少任一步就會留下一個永久說謊的中間狀態。
 *
 * ## 核准的分鐘不等於認列的分鐘
 *
 * `認列 = min(核准, 打卡事實)`。待了 3 小時只核准 2 小時，超出的 1 小時
 * 由回應的 `unapprovedMinutes` 交出去 —— 它仍然存在於 `AttendancePunch` 裡，
 * 而勞動檢查看得見（ADR 024 §2.1）。
 *
 * ## 上限是 throw 不是警示
 *
 * §32 II／III 的三條線（單日 12 小時、單月 46／54 小時、三個月 138 小時）
 * 在核准前檢查，越過即 throw：那不是需要人判斷的例外，是違法（ADR 024 §6.2）。
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

    // Info: (20260818 - Julian) body 可以整個省略；空 body 會讓 request.json() 丟例外，那是常態不是錯誤
    const body = await request.json().catch(() => ({}));
    const parsed = overtimeApprovalSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId, request_id: requestId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await overtimeRequestService.approve({
        accountBookId,
        requestId,
        actorEmployeeId: actor.id,
        approvedMinutes: parsed.data.approvedMinutes,
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
    logger.error("[API] overtime request approve failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
