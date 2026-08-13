import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { leaveTodayQuerySchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveService } from "@/services/leave.service";

/**
 * Info: (20260813 - Julian) A11：今日請假名單。
 * GET /api/v1/user/account_book/:account_book_id/hr/attendance/leave[?date=YYYY-MM-DD]
 *
 * **對所有員工開放**（計畫書 §8.5、§8.6）：「人手不足要能銷假」的前提是
 * 先看得到誰在放假，而在此之前請假的人在現場頁上完全不存在。
 *
 * 回應的 `canRequestRecall` 是呼叫者自己是不是主管 ——
 * 前端據此決定顯不顯示徵詢入口。真正的擋阻在 A12，不在這個布林值。
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
    const parsed = leaveTodayQuerySchema.safeParse({
      date: searchParams.get("date") ?? undefined,
    });
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const viewer = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveService.listToday({
        accountBookId,
        viewerEmployeeId: viewer.id,
        observedAt: new Date(),
        date: parsed.data.date,
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
    logger.error("[API] leave today read failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
