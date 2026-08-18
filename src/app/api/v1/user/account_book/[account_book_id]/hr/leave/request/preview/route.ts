import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { leaveRequestCreateSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leaveRequestService } from "@/services/leave_request.service";

/**
 * Info: (20260817 - Julian) L17：送出前試算。
 * POST /api/v1/user/account_book/[account_book_id]/hr/leave/request/preview
 *      body 與 L11 完全相同
 *
 * ## 為什麼是 POST 而不是 GET
 *
 * 它不寫入任何東西，語意上更像查詢 —— 但輸入是一個逐日展開的陣列，
 * 塞進 query string 會變成一串沒有人讀得懂的編碼，而且會撞上長度上限。
 * 與 L11 共用同一個 schema 也是刻意的：試算顯示「會扣 3 天、簽兩關」、
 * 送出卻扣了 4 天，那比沒有試算更糟。
 *
 * ## 靜態路徑與 `[request_id]` 的關係
 *
 * Next.js 的靜態區段優先於動態區段，因此本路徑不會被 `[request_id]` 吃掉。
 * 代價是「id 剛好叫 preview 的假單」永遠取不到 —— id 是 uuid，不會發生。
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
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    const body = await request.json();
    const parsed = leaveRequestCreateSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leaveRequestService.preview({
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
    logger.error("[API] leave request preview failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
