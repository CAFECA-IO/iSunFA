import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { listOpenJobs } from "@/services/resumable_job.service";

/**
 * Info: (20260825 - Luphia) GET /api/v1/user/job（issue #6712）：
 * 這個使用者**未完成**的可中斷任務。
 *
 * 畫面用它回答一個問題：「我上次那份匯入停在哪裡、現在能不能繼續」。
 * 只回書籤（步驟數與 id），沒有任何內容——內容留在各功能自己的儲存，
 * 個人會話那份是端到端加密的。
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    return jsonOk({ jobs: await listOpenJobs(user.id) });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    return jsonFail(API_ERRORS.TW_OPERATION_FAILED);
  }
}
