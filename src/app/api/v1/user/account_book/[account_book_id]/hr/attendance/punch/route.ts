import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail, jsonFailWithPayload } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { attendancePunchSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import {
  attendancePunchService,
  OutOfFenceError,
} from "@/services/attendance_punch.service";

/**
 * Info: (20260813 - Julian) 打卡。
 * POST /api/v1/user/account_book/:account_book_id/hr/attendance/punch
 *
 * body 只有 `punchType` / `latitude` / `longitude` / `accuracyMeters` ——
 * **沒有時間欄位**：`punchedAt` 一律由伺服器產生（護欄 G1）。
 *
 * 圍欄外回 403 並帶上最近地點與距離，讓站在現場的人知道該往哪走。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const body = await request.json();
    const parsed = attendancePunchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const { account_book_id: accountBookId } = await params;
    const employee = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    const status = await attendancePunchService.punch(employee, parsed.data);
    return jsonOk(status);
  } catch (error) {
    // Info: (20260813 - Julian) 圍欄外是唯一需要帶 payload 的失敗
    if (error instanceof OutOfFenceError) {
      return jsonFailWithPayload(
        {
          code: error.apiCode,
          message: error.message,
          status: error.code,
        },
        error.detail,
      );
    }
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] attendance punch failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
