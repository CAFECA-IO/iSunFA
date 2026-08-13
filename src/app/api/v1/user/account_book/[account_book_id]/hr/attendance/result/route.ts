import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { attendanceResultQuerySchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { attendanceResultService } from "@/services/attendance_result.service";

/**
 * Info: (20260813 - Julian) 出勤判定結果（期間 × 員工）。
 * GET /api/v1/user/account_book/:account_book_id/hr/attendance/result
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD[&employeeId=...]
 *
 * **即時計算，不讀結果表**（理由見 service 檔頭）。
 *
 * ToDo: (20260813 - Julian) Demo 版沒有範圍控制：只要是本帳本的員工，
 * 就看得到全帳本所有人的出勤判定。正式版必須分成兩條路徑 ——
 * 「我自己的」（任何員工）與「我管轄範圍的」（主管／HR，且需寫 AuditLog）。
 * 這是 demo 計畫書 §12.3 的第一順位升級項，不是可以留在正式環境的簡化。
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

    const { searchParams } = new URL(request.url);
    const parsed = attendanceResultQuerySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      employeeId: searchParams.get("employeeId") ?? undefined,
    });
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const { account_book_id: accountBookId } = await params;
    // Info: (20260813 - Julian) 先解析員工身分：沒有員工檔的人不該看到任何出勤資料
    await attendanceIdentityService.resolveEmployee(sessionUser, accountBookId);

    return jsonOk(
      await attendanceResultService.evaluateRange({
        accountBookId,
        query: parsed.data,
        /**
         * Info: (20260813 - Julian) 「現在」在這一層取一次，往下注入。
         *
         * service 與引擎都不呼叫 `new Date()` —— 那會讓同一組輸入在不同時刻
         * 得到不同結果，而可重算是這整套判定唯一的驗收方式。
         */
        evaluatedAt: new Date(),
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
    logger.error("[API] attendance result failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
