import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { leaveBalanceQuerySchema, leaveLedgerQuerySchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveBalanceService } from "@/services/leave_balance.service";

/**
 * Info: (20260817 - Julian) L8：額度異動明細（帳本）。
 * GET /api/v1/user/account_book/[account_book_id]/hr/leave/balance/ledger[?employeeId=&leavePolicyId=&limit=]
 *
 * 這是餘額的**依據**，不是它的另一種顯示。餘額快取與帳本不一致時
 * 帳本是對的那一個（ADR 022 §4），所以這支端點是對帳的入口 ——
 * 「我的特休怎麼少了兩天」只有在這裡答得出來。
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

    const { searchParams } = new URL(request.url);
    const scope = leaveBalanceQuerySchema.safeParse({
      employeeId: searchParams.get("employeeId") ?? undefined,
    });
    const query = leaveLedgerQuerySchema.safeParse({
      leavePolicyId: searchParams.get("leavePolicyId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!scope.success || !query.success) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveBalanceService.listLedger({
        actorEmployeeId: actor.id,
        accountBookId,
        employeeId: scope.data.employeeId ?? actor.id,
        leavePolicyId: query.data.leavePolicyId,
        limit: query.data.limit,
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
    logger.error("[API] leave ledger list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
