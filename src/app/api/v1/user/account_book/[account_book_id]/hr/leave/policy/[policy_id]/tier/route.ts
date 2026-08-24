import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { leaveAccrualTierTableSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leavePolicyService } from "@/services/leave_policy.service";

/**
 * Info: (20260818 - Julian) L5：年資級距表。
 * GET /api/v1/user/account_book/[account_book_id]/hr/leave/policy/:policy_id/tier
 *
 * 級距表是特休日數的唯一來源（勞基法 §38 I）。它是**資料不是程式碼** ——
 * 2016 年那次修法改的就是這張表（`ANNUAL_LEAVE_TIER_SEED` 的檔頭）。
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; policy_id: string }> },
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

    const { account_book_id: accountBookId, policy_id: leavePolicyId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leavePolicyService.listTiers({
        accountBookId,
        actorEmployeeId: actor.id,
        leavePolicyId,
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
    logger.error("[API] leave accrual tier list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260818 - Julian) L6：覆寫年資級距表（**全量取代，非差異更新**）。
 * PUT /api/v1/user/account_book/[account_book_id]/hr/leave/policy/:policy_id/tier
 *      body：`{ tiers: [{ minSeniorityMonths, days, incrementDaysPerYear?, maxDays? }] }`
 *
 * ## 為什麼是全量
 *
 * 級距表是一張**整體**才有意義的階梯。逐列增修會讓中間狀態出現「有洞」
 * 或「日數倒退」的表，而授予 Worker 可能剛好在那一刻讀到它 ——
 * 症狀是某個人那一次授予拿到一個查不到來源的天數。
 *
 * ## 階梯的三條規則
 *
 * 年資下界遞增且不重複、日數不得倒退（做越久假越少在 §38 I 站不住）、
 * 每年加給只能掛在最後一級。三條都由 `assertAccrualTierTable` 在 repository 擋 ——
 * 它同時要守住 seed 這條路徑，而 seed 正是修法時要改的東西。
 *
 * 只有 `SENIORITY_TIER` 的假別吃級距表；其餘回 `VA_LEAVE_TIER_NOT_APPLICABLE`，
 * 因為存進去的效果是一張永遠不會被讀到的表。
 */
export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; policy_id: string }> },
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
    const parsed = leaveAccrualTierTableSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId, policy_id: leavePolicyId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leavePolicyService.replaceTiers({
        accountBookId,
        actorEmployeeId: actor.id,
        leavePolicyId,
        input: parsed.data,
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
    logger.error("[API] leave accrual tier replace failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
