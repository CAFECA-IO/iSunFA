import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { leaveRequestCreateSchema, leaveRequestListQuerySchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveRequestService } from "@/services/leave_request.service";

/**
 * Info: (20260817 - Julian) L10：假單清單。
 * GET .../hr/leave/request[?from=&to=&employeeId=]
 *
 * 未指定 `employeeId` 即為自己。指定他人時必須是該單的簽核者，
 * 否則回 `FO_LEAVE_REQUEST_SCOPE` —— **不是回空陣列**：
 * 空陣列是對資料的陳述（「他沒請過假」），被擋是對請求的陳述。
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
    const parsed = leaveRequestListQuerySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      employeeId: searchParams.get("employeeId") ?? undefined,
    });
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveRequestService.list({
        accountBookId,
        actorEmployeeId: actor.id,
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
    logger.error("[API] leave request list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260817 - Julian) L11：送出假單。
 * POST .../hr/leave/request
 *      body：`{ leavePolicyId, reason, days: [{ workDate, segment, startMinute?, endMinute? }] }`
 *
 * **不預扣額度** —— 扣減發生在最後一個簽核節點通過的那個交易內（ADR 023 §6）。
 * 簽核鏈展不開時拒絕送出而不是自動核准：自動核准會讓一個設定缺口
 * 靜默地變成一張看起來正常的生效假單。
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
    const parsed = leaveRequestCreateSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveRequestService.submit({
        accountBookId,
        employeeId: actor.id,
        input: parsed.data,
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
    logger.error("[API] leave request submit failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
