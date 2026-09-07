import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { overtimeSummaryQuerySchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { overtimeReportService } from "@/services/overtime_report.service";

/**
 * Info: (20260818 - Julian) L28：加班時數統計（月／季，含上限使用率）。
 * GET /api/v1/user/account_book/[account_book_id]/hr/overtime/summary?month=YYYY-MM[&employeeId=]
 *
 * ## 兩個分開的數字
 *
 * `punchBackedMinutes` 與 `declaredMinutes` —— 勞動檢查會問「你們有多少加班
 * 沒有出勤紀錄佐證」，而一個答不出這題的系統，等於默認全部都是（ADR 024 §2.2）。
 *
 * ## 回上限而不是回使用率
 *
 * 使用率是一個浮點數，折進 API 會丟掉兩件事：分母是 46 還是 54 小時
 * （取決於有沒有記載的同意），以及還剩幾分鐘 —— 而主管要回答的問題正是
 * 「這個月還能讓他加幾小時」。
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
    const parsed = overtimeSummaryQuerySchema.safeParse({
      month: searchParams.get("month") ?? undefined,
      employeeId: searchParams.get("employeeId") ?? undefined,
    });
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await overtimeReportService.summarize({
        accountBookId,
        actorEmployeeId: actor.id,
        employeeId: parsed.data.employeeId ?? actor.id,
        month: parsed.data.month,
        /**
         * Info: (20260820 - Julian) 「現在」由 route 讀一次再傳下去
         * （review 第 5 輪 M5）。當月的滾動三個月窗要夾到今天，
         * 否則左端會被推到未來的月底去算，反而丟掉最舊的那幾天。
         */
        observedAt: new Date(),
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
    logger.error("[API] overtime summary failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
