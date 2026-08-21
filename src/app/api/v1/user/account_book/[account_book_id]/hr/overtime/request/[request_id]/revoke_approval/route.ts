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
 * Info: (20260821 - Julian) L27-b：撤銷核准，讓加班單回到待簽（review 第 7 輪 B1）。
 * POST /api/v1/user/account_book/[account_book_id]/hr/overtime/request/:request_id/revoke_approval
 *
 * ## 為什麼要有這一支
 *
 * `VA_OVERTIME_EARLIER_THAN_APPROVED` 的五個語系文案都叫使用者
 * 「先撤回較晚那一張，兩張一起重送」—— 而在這一支之前，**沒有任何端點
 * 能把一張單從 `APPROVED` 移出來**（五個 `updateMany` 全部 `where.status
 * = PENDING`）。一句沒有執行者的補救，比沒有補救更糟：它讓讀訊息的人
 * 以為有路可走，而那段真實工時就此永久留在系統外。
 *
 * ## 沒有 body
 *
 * 撤銷之後單子回到待簽、仍要再被決行一次，它不終結任何東西 ——
 * 需要說明「為什麼」的是 `withdraw` 那種終局動作。
 *
 * ## 限流用寫入桶
 *
 * 它會刪掉額度批次與折現事件，是本模組破壞性最強的一支。
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; request_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260821 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.LEAVE_WRITE,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId, request_id: requestId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await overtimeRequestService.revokeApproval({
        accountBookId,
        requestId,
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
    logger.error("[API] overtime request revoke approval failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
