import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { leaveAccrualRunSchema } from "@/validators";
import { DEMO_TIME_ZONE } from "@/constants/attendance";
import { toZonedParts } from "@/lib/utils/attendance_time";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveBalanceService } from "@/services/leave_balance.service";

/**
 * Info: (20260817 - Julian) L33：把額度補到某一天為止。
 * POST .../hr/leave/balance/accrue
 *      body：`{ employeeId?, asOfDate? }`（皆可省略：自己、今天）
 *
 * **可以隨便重跑。** `deriveGrantSchedule` 回的是「應該有哪些批次」，
 * repository 只補缺的 —— 重複觸發、補跑三個月前漏掉的、同一秒按兩次，
 * 結果都一樣（冪等鍵由週期起日組成）。
 *
 * 回應是實際新增的批次數；**0 代表已經是最新的，不是失敗**。
 *
 * ToDo: (20260817 - Julian) 這支端點的長期歸宿是每日 Worker，不是人手動按。
 * 在 Worker 掛上之前它是唯一的觸發點（里程碑 4）。
 */
export async function POST(
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
      RateLimitBucketEnum.LEAVE_WRITE,
    );
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const parsed = leaveAccrualRunSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    const issued = await leaveBalanceService.accrueForEmployee({
      accountBookId,
      employeeId: parsed.data.employeeId ?? actor.id,
      asOfDate:
        parsed.data.asOfDate ??
        toZonedParts(new Date(), DEMO_TIME_ZONE).isoDate,
      actorEmployeeId: actor.id,
    });

    return jsonOk({ issued });
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] leave accrual run failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
