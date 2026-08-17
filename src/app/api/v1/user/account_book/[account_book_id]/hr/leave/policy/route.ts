import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leavePolicyRepo } from "@/repositories/leave_policy.repo";

/**
 * Info: (20260817 - Julian) L1：可請的假別清單。
 * GET .../hr/leave/policy
 *
 * 全體員工可讀 —— 「公司有哪些假可以請」不是機密，而藏起來的效果是
 * 員工不知道自己有生理假可以請。
 *
 * 只回請假表單需要的欄位，不回整張 `LeavePolicy`：`paidRatio` 是薪資模組的事，
 * 給假規則是 HR 設定畫面的事。
 *
 * ToDo: (20260817 - Julian) L2–L6（新增／修改／停用／級距）待甲-1 的角色模型。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { account_book_id: accountBookId } = await params;
    await attendanceIdentityService.resolveEmployee(sessionUser, accountBookId);

    return jsonOk(await leavePolicyRepo.listActive(accountBookId));
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
