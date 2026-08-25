import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import {
  overtimeRequestCreateSchema,
  overtimeRequestListQuerySchema,
} from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { overtimeRequestService } from "@/services/overtime_request.service";

/**
 * Info: (20260818 - Julian) L24：加班單清單。
 * GET /api/v1/user/account_book/[account_book_id]/hr/overtime/request[?from=&to=&employeeId=]
 *
 * 未指定 `employeeId` 即為自己。指定他人時必須管得到他或具 `HR_ADMIN` 職能，
 * 否則回 403 —— **不是回空陣列**：空陣列是對資料的陳述（「他沒加過班」），
 * 被擋是對請求的陳述。
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
    const parsed = overtimeRequestListQuerySchema.safeParse({
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
      await overtimeRequestService.list({
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
    logger.error("[API] overtime request list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260818 - Julian) L25：送出加班單（事前或事後）。
 * POST /api/v1/user/account_book/[account_book_id]/hr/overtime/request
 *      body：`{ workDate, filingType, compensationMode, requestedStartMinute,
 *               requestedEndMinute, reason }`
 *
 * Info: (20260819 - Julian) `isEmergency` **不在這個 payload 裡**（review B7）。
 * §32 IV 的認定由具 `HR_ADMIN` 職能者在核准端點給出，並強制附上報備紀錄 ——
 * 讓申請人自己勾一個布林值就跳到加倍發給，那個旗標是一句沒有證據的宣稱。
 *
 * ## 事前／事後不是自由欄位
 *
 * `ADVANCE` 必須在該日班別窗起之前送出，`POST_HOC` 反之，由
 * `assertOvertimeFilingType` 在 repository 擋（唯一 DB 閘口）。
 * 「事前申請卻在下班後才送出」不是一種可選的填法，是一個謊 ——
 * 而且是有動機的謊：事後補單在勞動檢查時的證據力較低。
 *
 * ## 例假日一律擋下
 *
 * §40 原則上不得使人於例假工作，僅限天災、事變或突發事件，且應報當地主管機關
 * **核備**並事後補假休息。系統尚未實作核備與補假，故回 `FO_OVERTIME_ON_REGULAR_OFF`
 * —— 放行會讓一個違法的排班看起來像一筆正常的加班（ADR 024 §4.5）。
 */
export async function POST(
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
      RateLimitBucketEnum.LEAVE_WRITE,
    );
    if (limited) return limited;

    const body = await request.json();
    const parsed = overtimeRequestCreateSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await overtimeRequestService.submit({
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
    logger.error("[API] overtime request submit failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
