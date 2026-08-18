import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { leaveApprovalRuleReplaceSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveApprovalRuleService } from "@/services/leave_approval_rule.service";

/**
 * Info: (20260817 - Julian) L31：簽核規則清單。
 * GET .../hr/leave/approval_rule
 *
 * 回應分成 `general`（通則）與 `byPolicy`（假別專屬）兩組，
 * 而不是一個扁平陣列 —— 前端要呈現的是「這個假別走哪一套」，
 * 而那個判斷需要知道某個 `leavePolicyId` 有沒有自己的規則。
 * 讓前端自己 groupBy 等於把同一段邏輯複製到每個畫面。
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

    const { account_book_id: accountBookId } = await params;
    // Info: (20260817 - Julian) 解析員工身分：確認呼叫者確實屬於這個帳本
    await attendanceIdentityService.resolveEmployee(sessionUser, accountBookId);

    return jsonOk(await leaveApprovalRuleService.list(accountBookId));
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] leave approval rule list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260817 - Julian) L32：整組取代某個 scope 的簽核規則。
 * PUT .../hr/leave/approval_rule
 *     body：`{ leavePolicyId: string | null, rules: [{ minDays, maxDays, steps }] }`
 *
 * **PUT 而不是 POST/PATCH**：規則的正確性是集合層級的（必須是 `[0, ∞)` 的
 * 一個分割），逐條增修無法在當下判斷結果合不合法 —— 刪掉中間一條之後，
 * 剩下的每一條都還是「合法的一條規則」，而整組已經有洞了。
 * 那個洞的症狀是假單以 `NO_MATCHING_RULE` 被拒，而訊息會指向人事資料。
 *
 * 取代範圍只限傳入的那一個 scope：改特休不會動到通則。
 */
export async function PUT(
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
    const parsed = leaveApprovalRuleReplaceSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveApprovalRuleService.replaceScope({
        accountBookId,
        actorEmployeeId: actor.id,
        leavePolicyId: parsed.data.leavePolicyId,
        rules: parsed.data.rules,
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
    logger.error("[API] leave approval rule replace failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
