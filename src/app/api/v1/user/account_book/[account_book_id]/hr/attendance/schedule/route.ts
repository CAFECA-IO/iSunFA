import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import {
  attendanceScheduleQuerySchema,
  attendanceScheduleUpdateSchema,
} from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { attendanceScheduleService } from "@/services/attendance_schedule.service";

/**
 * Info: (20260813 - Julian) 排班月曆。
 * GET  /api/v1/user/account_book/:account_book_id/hr/attendance/schedule
 *        ?from=YYYY-MM-DD&to=YYYY-MM-DD[&departmentId=...]
 * PUT  同一路徑，body：`{ employeeId, workDate, dayType, shiftPatternId }`
 *
 * ## 為什麼與判定矩陣（A9）分成兩支
 *
 * 這一支是判定的**輸入**（人排的），那一支是**輸出**（系統算的）。
 * 排班畫面必須能在判定之外獨立存在 —— 下個月的班表現在就排得出來，
 * 而那時還沒有任何打卡可判。
 *
 * Info: (20260817 - Luphia) PUT 限部門主管（service 層的 `isDepartmentManager` 閘）。
 * GET 維持全帳本可見 —— 讀取範圍屬計畫書 §7.3 第 1 順位的權限矩陣，尚未實作。
 *
 * 每一次成功的異動寫一筆 `EMPLOYEE_PII` / `UPDATE` 稽核（`dataId` 是被改的員工），
 * 因為改排班等於改判定的比較基準 —— 詳見 service 的說明。
 *
 * ToDo: (20260817 - Luphia) 主管閘只是收窄，不是權限矩陣：HR 承辦不是任何部門的
 * `managerId`，正式版會被這道閘擋住，屆時由權限矩陣取代而不是疊在它上面。
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

    // Info: (20260817 - Luphia) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const parsed = attendanceScheduleQuerySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
    });
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const { account_book_id: accountBookId } = await params;
    await attendanceIdentityService.resolveEmployee(sessionUser, accountBookId);

    return jsonOk(
      await attendanceScheduleService.getCalendar({
        accountBookId,
        query: parsed.data,
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
    logger.error("[API] attendance schedule read failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260817 - Luphia) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.ATTENDANCE_WRITE,
    );
    if (limited) return limited;

    const body = await request.json();
    /**
     * Info: (20260813 - Julian) 這一支 schema 是可辨識聯集：
     * 「上班日沒帶班別」與「休假日卻帶了班別」連解析都過不了，
     * 不需要在下面再寫一次 if（ADR 019）。
     */
    const parsed = attendanceScheduleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await attendanceScheduleService.updateScheduleDay({
        accountBookId,
        input: parsed.data,
        actorEmployeeId: actor.id,
        actorEmployeeNo: actor.employeeNo,
        // Info: (20260817 - Luphia) 稽核記的是操作者的 User，dataId 記被改的員工
        actorUserId: sessionUser.id,
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
    logger.error("[API] attendance schedule update failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
