import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { leaveRecallRespondSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveService } from "@/services/leave.service";

/**
 * Info: (20260813 - Julian) A14：回應銷假徵詢。
 * POST .../hr/attendance/leave/recall/:recall_id/respond
 *      body：`{ decision: "ACCEPT" | "DECLINE", note? }`
 *
 * **同意的那一刻才會改排班**，而且與「請假日退出生效」在同一個交易裡 ——
 * 少了任何一半，同一天會同時「在請假」與「要上班」。
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; recall_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const body = await request.json();
    const parsed = leaveRecallRespondSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId, recall_id: recallId } =
      await params;
    const employee = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveService.respondRecall({
        accountBookId,
        recallId,
        employeeId: employee.id,
        employeeNo: employee.employeeNo,
        decision: parsed.data.decision,
        note: parsed.data.note,
        respondedAt: new Date(),
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
    logger.error("[API] leave recall respond failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
