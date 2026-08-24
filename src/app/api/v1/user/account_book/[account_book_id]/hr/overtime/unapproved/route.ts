import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { overtimeUnapprovedQuerySchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { overtimeReportService } from "@/services/overtime_report.service";

/**
 * Info: (20260818 - Julian) L29：有打卡但無核准加班單的時段。
 * GET /api/v1/user/account_book/[account_book_id]/hr/overtime/unapproved?from=&to=[&employeeId=]
 *
 * ## 這一支不下結論
 *
 * 它回的是 `在場區間 − 班別窗 − 已核准的加班區間`。剩下的分鐘是事實：
 * 那個人在現場，而沒有任何一張單涵蓋它。可能是漏了申請，也可能只是
 * 下班後多待了半小時 —— 由主管決定要補核准、要說明、還是要制止。
 * **系統的責任是讓它浮出來，不是替任何一方作結論**（ADR 024 §2.1）。
 *
 * ## 它不落地
 *
 * 純推導、不存表（ADR 024 §9.5）。補了核准之後這一筆就會消失，
 * 而那正是目的 —— 一份會留下歷史的清單，還要再回答「這筆後來處理了沒有」。
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
    const parsed = overtimeUnapprovedQuerySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      employeeId: searchParams.get("employeeId") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
    });
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    /**
     * Info: (20260820 - Julian) `scope=team` 回**陣列**（review 第 6 輪 M23）。
     *
     * 不把單人版包成一元陣列來統一形狀：那會讓「我的加班」頁多一層解包，
     * 而它的語意本來就是一份報告。兩種形狀由 `scope` 決定，呼叫端自己知道
     * 它問的是哪一種。
     */
    if (parsed.data.scope === "team") {
      return jsonOk(
        await overtimeReportService.listUnapprovedForTeam({
          accountBookId,
          actorEmployeeId: actor.id,
          from: parsed.data.from,
          to: parsed.data.to,
        }),
      );
    }

    return jsonOk(
      await overtimeReportService.listUnapproved({
        accountBookId,
        actorEmployeeId: actor.id,
        employeeId: parsed.data.employeeId ?? actor.id,
        from: parsed.data.from,
        to: parsed.data.to,
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
    logger.error("[API] overtime unapproved list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
