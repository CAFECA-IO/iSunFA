import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
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
 * ToDo: (20260813 - Julian) Demo 沒有權限控制：任何員工都改得了任何人的班。
 * 正式版排班是 HR／主管的動作，且**必須留下異動軌跡** ——
 * 改排班等於改判定的比較基準，見 service 的說明。
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
        actorEmployeeNo: actor.employeeNo,
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
