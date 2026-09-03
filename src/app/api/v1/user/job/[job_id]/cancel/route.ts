import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { cancelJob } from "@/services/resumable_job.service";

/**
 * Info: (20260827 - Luphia) POST /api/v1/user/job/[job_id]/cancel（issue #6714）：
 * 放棄一個沒做完的任務。
 *
 * 在此之前 `cancelJob()` 是一個沒有路由的 export——也就是說使用者沒有辦法把
 * 一份不想做完的匯入清掉，它會一直掛在「未完成」裡，而畫面上那顆「接著匯入」
 * 會一直邀請他去花錢。
 *
 * 取消**只放棄還沒做的那幾份**：已經解析完的內容留在待匯入的暫存裡（那是已經
 * 付過錢的東西），使用者仍然可以套用它。這一支不刪任何內容，只把書籤的狀態
 * 改成 CANCELLED。
 *
 * 用 POST 而不是 DELETE：被取消的任務仍然留著（狀態是 CANCELLED，不是消失），
 * 而 DELETE 會讓呼叫端以為那一列不見了。與 `resume` 對稱。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ job_id: string }> },
) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { job_id: jobId } = await params;
    await cancelJob({ jobId, userId: user.id });
    return jsonOk({ jobId, cancelled: true });
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
