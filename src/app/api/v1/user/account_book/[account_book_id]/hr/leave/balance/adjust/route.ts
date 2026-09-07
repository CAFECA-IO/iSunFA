import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import {
  leaveBalanceAdjustSchema,
  leaveBalanceQuerySchema,
} from "@/validators";
import { DEMO_TIME_ZONE } from "@/constants/attendance";
import { toZonedParts } from "@/lib/utils/attendance_time";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveBalanceService } from "@/services/leave_balance.service";

/**
 * Info: (20260817 - Julian) L9：人工調整額度。
 * POST /api/v1/user/account_book/[account_book_id]/hr/leave/balance/adjust?employeeId=...
 *      body：`{ leavePolicyId, deltaMinutes, reason }`
 *
 * 正負皆可。用途是補一個系統算不出來的量 —— 前公司年資、協商遞延
 * （§38 IV）、勞檢後補發。
 *
 * **理由必填**：一筆沒有理由的額度調整，事後沒有人能判斷它合不合理，
 * 而它會直接變成錢（未休折現）。分錄上會記下操作者與這句理由。
 *
 * Info: (20260819 - Julian) **限 `HR_ADMIN`**，閘在 service（`assertMayAdjustBalance`）。
 * 額度會變成錢（未休折現），而主管對組員的加薪權不會因為他是主管就自動存在。
 *
 * Info: (20260820 - Julian) 且**不得調整自己的**（review 第 5 條）。
 * `deltaMinutes` 上界 ±366 天、冪等鍵是隨機值（人工調整本來就允許重複），
 * 因此連打有效 —— 少了這一道，一位人資可以在一分鐘內給自己加上任意多的特休。
 * `employeeId` 取自 query，`actorEmployeeId` 取自 DeWT 解析出來的身分：
 * 兩者的來源不同是這道閘的前提，由 `leave_route_wiring.test.ts` 釘住。
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

    const body = await request.json();
    const parsed = leaveBalanceAdjustSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { searchParams } = new URL(request.url);
    const scope = leaveBalanceQuerySchema.safeParse({
      employeeId: searchParams.get("employeeId") ?? undefined,
    });
    if (!scope.success || !scope.data.employeeId) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveBalanceService.adjust({
        accountBookId,
        employeeId: scope.data.employeeId,
        leavePolicyId: parsed.data.leavePolicyId,
        deltaMinutes: parsed.data.deltaMinutes,
        reason: parsed.data.reason,
        actorEmployeeId: actor.id,
        asOfDate: toZonedParts(new Date(), DEMO_TIME_ZONE).isoDate,
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
    logger.error("[API] leave balance adjust failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
