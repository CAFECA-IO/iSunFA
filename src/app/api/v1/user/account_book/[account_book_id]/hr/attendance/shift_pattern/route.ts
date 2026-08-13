import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { attendanceScheduleService } from "@/services/attendance_schedule.service";

/**
 * Info: (20260813 - Julian) 班別清單。
 * GET /api/v1/user/account_book/:account_book_id/hr/attendance/shift_pattern
 *
 * 回傳含衍生的 `kind`（固定／彈性）—— 那不是資料庫欄位，
 * 而是六個時間欄位的值決定的（§D1）。
 *
 * 班別的建立與修改走 seed，本期不做 CRUD 端點（demo 計畫書 §7）。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { account_book_id: accountBookId } = await params;
    await attendanceIdentityService.resolveEmployee(sessionUser, accountBookId);

    return jsonOk(
      await attendanceScheduleService.listShiftPatterns(accountBookId),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] attendance shift pattern failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
