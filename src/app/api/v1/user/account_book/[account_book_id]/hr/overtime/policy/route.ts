import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { overtimePolicyUpdateSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { overtimePolicyService } from "@/services/overtime_policy.service";

/**
 * Info: (20260818 - Julian) 加班政策的讀取。
 * GET /api/v1/user/account_book/[account_book_id]/hr/overtime/policy
 *
 * 計畫書 §10 只編了 L30（PUT）。讀取一併做在這裡，理由與 L31／L32 相同：
 * 改不了自己看不到的東西，而設定畫面第一件事就是把現值載出來。
 *
 * 全體員工可讀 —— 「這個帳本的加班上限是幾小時」不是機密，
 * 藏起來的效果是員工不知道自己這個月還能加幾小時。
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
    await attendanceIdentityService.resolveEmployee(sessionUser, accountBookId);

    return jsonOk(await overtimePolicyService.read(accountBookId));
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] overtime policy read failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260818 - Julian) L30：設定加班政策。
 * PUT /api/v1/user/account_book/[account_book_id]/hr/overtime/policy
 *      body：`{ extendedLimitAgreed, agreementRecordUrl, agreedAt, compensatoryExpiryMonths }`
 *
 * ## 全量取代，不是差異更新
 *
 * 送上來的是一份完整的政策。把「沒送的欄位就不動」當成語意，
 * 會讓「取消同意」變成一個沒有辦法表達的動作（同 `/admin/settings` 的既有處置）。
 *
 * ## 放寬到 54 小時必須有記載
 *
 * `extendedLimitAgreed` 為真時 `agreementRecordUrl` 與 `agreedAt` 必填，
 * 由 `assertOvertimePolicy` 在 repository 擋 —— **一個沒有記載的「已同意」
 * 等於沒有同意，而系統會據此多放 8 小時**（ADR 024 §6.1）。
 *
 * 需 `HR_ADMIN` 職能：財務的帳本 `ADMIN` 不是人資，而把這個開關交給他，
 * 等於讓一個看不懂 §32 III 的人去按它（ADR 023 §8.3）。
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
    const parsed = overtimePolicyUpdateSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await overtimePolicyService.update({
        accountBookId,
        actorEmployeeId: actor.id,
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
    logger.error("[API] overtime policy update failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
