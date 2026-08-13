import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { leaveRecallCreateSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveService } from "@/services/leave.service";

/**
 * Info: (20260813 - Julian) A12：發起銷假徵詢。
 * POST /api/v1/user/account_book/:account_book_id/hr/attendance/leave/recall
 *      body：`{ leaveDayId, shiftPatternId, reason }`
 *
 * **這一支不會改動任何排班。** 它只建立一張待回應的徵詢 ——
 * 排班的寫入發生在員工按下同意的那一刻（A14），理由見 service 的說明與勞基法 §38 III。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const body = await request.json();
    const parsed = leaveRecallCreateSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveService.requestRecall({
        accountBookId,
        leaveDayId: parsed.data.leaveDayId,
        shiftPatternId: parsed.data.shiftPatternId,
        reason: parsed.data.reason,
        actorEmployeeId: actor.id,
        actorEmployeeNo: actor.employeeNo,
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
    logger.error("[API] leave recall request failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
