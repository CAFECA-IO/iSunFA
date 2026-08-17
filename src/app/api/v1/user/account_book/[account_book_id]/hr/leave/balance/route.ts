import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { leaveBalanceQuerySchema } from "@/validators";
import { DEMO_TIME_ZONE } from "@/constants/attendance";
import { toZonedParts } from "@/lib/utils/attendance_time";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveBalanceService } from "@/services/leave_balance.service";

/**
 * Info: (20260817 - Julian) L7：各假別餘額。
 * GET .../hr/leave/balance[?employeeId=&asOfDate=]
 *
 * 未指定 `employeeId` 即為自己。
 *
 * ToDo: (20260817 - Julian) 查他人目前只驗身分 —— HR 角色沒有來源（甲-1）。
 * 餘額不是 Tier 2 個資（它不揭露健康狀態），但它仍是個人資料，
 * 正式版應限於 HR 與該員工的主管鏈。缺口見假勤接線守則 §3.5.1。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { searchParams } = new URL(request.url);
    const parsed = leaveBalanceQuerySchema.safeParse({
      employeeId: searchParams.get("employeeId") ?? undefined,
      asOfDate: searchParams.get("asOfDate") ?? undefined,
    });
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveBalanceService.list({
        accountBookId,
        employeeId: parsed.data.employeeId ?? actor.id,
        // Info: (20260817 - Julian) 「今天」用當地日曆日，不是 UTC
        asOfDate:
          parsed.data.asOfDate ??
          toZonedParts(new Date(), DEMO_TIME_ZONE).isoDate,
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
    logger.error("[API] leave balance list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
