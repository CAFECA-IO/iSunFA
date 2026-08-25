import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { hrIdentityService } from "@/services/hr_identity.service";

/**
 * Info: (20260818 - Julian) 登入者在本帳本的員工身分。
 * GET /api/v1/user/account_book/[account_book_id]/hr/me
 *
 * 回傳工號、姓名、職稱、部門，以及兩個**顯示用**的能力旗標
 * （是不是部門主管、有哪些 HR 職能）。授權仍由每一支端點自己執行 ——
 * 這一支的用途是讓畫面不要顯示一個按下去必定沒有東西的入口。
 *
 * 沒有綁到員工檔時回 404（`NF_EMPLOYEE_FOR_USER`），與其他假勤端點一致：
 * 回 403 會洩漏「這個信箱在這個帳本裡有員工檔」。
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
    /**
     * Info: (20260818 - Julian) 綁定留在 route，與其他假勤端點一致。
     * `attendance_rate_limit.test.ts` 以 `resolveEmployee` 為業務邏輯的錨點，
     * 用它證明限流排在業務邏輯之前 —— 藏進 service 會讓那條保證靜默失效。
     */
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(await hrIdentityService.describe(actor));
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] hr identity lookup failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
