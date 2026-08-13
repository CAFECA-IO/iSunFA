import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { attendancePunchService } from "@/services/attendance_punch.service";

/**
 * Info: (20260813 - Julian) 我今天的出勤狀態。
 * GET /api/v1/user/account_book/:account_book_id/hr/attendance/today
 *
 * 無打卡也要回得出來 —— 前端據此顯示今日班別與該按哪一顆按鈕。
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
    const employee = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(await attendancePunchService.getTodayStatus(employee));
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] attendance today failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
