import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { overtimeRequestService } from "@/services/overtime_request.service";

/**
 * Info: (20260818 - Julian) 待我簽核的加班單。
 * GET /api/v1/user/account_book/[account_book_id]/hr/overtime/request/pending
 *
 * ## 計畫書 §10 沒有為它編號
 *
 * 但 L26／L27 沒有它就沒有入口：主管無法得知有誰送了單，而一張沒有人知道
 * 它存在的加班單，等於沒有送出。假單那邊是 L16 `request/pending`，
 * 加班漏了對應的一支 —— 這裡補上，編號待計畫書同步。
 *
 * ## 這一頁對所有人開放
 *
 * 不是主管的人打開它會看到空清單，而那是正確的：「你沒有要簽的單」與
 * 「你沒有權限」是兩件事，用 403 表達前者會讓一個剛被升為主管的人
 * 以為系統壞了（同 L16 的既有處置）。
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
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await overtimeRequestService.listPending({
        accountBookId,
        actorEmployeeId: actor.id,
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
    logger.error("[API] overtime pending list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
