import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveService } from "@/services/leave.service";

/**
 * Info: (20260813 - Julian) A13：我待回應的銷假徵詢。
 * GET /api/v1/user/account_book/:account_book_id/hr/attendance/leave/recall/pending
 *
 * 沒有查詢參數：**它只回呼叫者自己的**。帶 employeeId 進來會讓這支端點
 * 順便變成「查某人被要求回來過幾次」的介面，而那不是它的職責。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { account_book_id: accountBookId } = await params;
    const employee = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveService.listPendingFor({
        accountBookId,
        employeeId: employee.id,
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
    logger.error("[API] pending leave recall read failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
