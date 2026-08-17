import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveRequestService } from "@/services/leave_request.service";

/**
 * Info: (20260817 - Julian) L12：假單明細（含簽核鏈快照）。
 * GET .../hr/leave/request/:request_id
 *
 * 可見者：申請人本人，或**鏈上任何一個節點**（不限當前待簽）——
 * 簽過的人有權回看自己簽了什麼，那是他的責任的一部分。
 *
 * 回傳的簽核鏈是**快照**：核准者日後改名、調部門、離職，
 * 這張單顯示的仍是當時的工號與姓名（ADR 023 §2）。
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; request_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { account_book_id: accountBookId, request_id: requestId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveRequestService.get({
        accountBookId,
        requestId,
        actorEmployeeId: actor.id,
        // Info: (20260817 - Julian) 讀他人事由要留個資軌跡，而軌跡記的是平台身分
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
    logger.error("[API] leave request read failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260817 - Julian) L13：撤回假單。
 * DELETE .../hr/leave/request/:request_id
 *
 * **只有申請人自己、且只在尚未有任何決定之前。** 已被駁回或已核准的單
 * 不能撤回 —— 那不是撤回，是要求別人改變已經做過的決定。
 *
 * 用 DELETE 而非 POST /withdraw：它移除的是「這張單還在流程裡」這個事實，
 * 而單據本身不刪（`status = WITHDRAWN`）—— 刪掉的話「他曾經送過又撤回」
 * 就消失了，而那是排班協調時會被問到的事。
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; request_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { account_book_id: accountBookId, request_id: requestId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveRequestService.withdraw({
        accountBookId,
        requestId,
        actorEmployeeId: actor.id,
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
    logger.error("[API] leave request withdraw failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
