import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leavePolicyService } from "@/services/leave_policy.service";
import { leavePolicyWriteSchema } from "@/validators";

/**
 * Info: (20260817 - Julian) L1：可請的假別清單。
 * GET /api/v1/user/account_book/[account_book_id]/hr/leave/policy
 *
 * 全體員工可讀 —— 「公司有哪些假可以請」不是機密，而藏起來的效果是
 * 員工不知道自己有生理假可以請。
 *
 * 只回請假表單需要的欄位，不回整張 `LeavePolicy`：`paidRatio` 是薪資模組的事，
 * 給假規則是 HR 設定畫面的事。
 *
 * Info: (20260818 - Julian) L2–L6 已補（甲-1 的 `EmployeeHrFunctionAssignment` 落地後）。
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

    return jsonOk(await leavePolicyService.listActive({ accountBookId }));
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] leave policy list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260818 - Julian) L2：新增自訂假別。
 * POST /api/v1/user/account_book/[account_book_id]/hr/leave/policy
 *
 * ## 建出來的一律是租戶自訂
 *
 * `isSystemDefined` 由 seed 決定，API 碰不到它。內建的十三種假別是
 * 勞基法與性平法的落地，它們的存在不該取決於有沒有人按過某個按鈕
 * （ADR 021 §5：「seed 成為正確性的一部分」）。
 *
 * ## 欄位組合的把關不在這一層
 *
 * Zod 只擋型別；「`FIXED_MINUTES` 卻沒有分鐘數」「`SENIORITY_TIER` 卻帶固定日數」
 * 這類矛盾由 `assertLeavePolicyUnit` 在 repository 擋 —— 它同時要守住
 * seed 這條不經過任何 validator 的路徑。
 *
 * 需 `HR_ADMIN` 職能。
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
    const parsed = leavePolicyWriteSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leavePolicyService.create({
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
    logger.error("[API] leave policy create failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
