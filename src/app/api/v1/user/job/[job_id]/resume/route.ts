import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { startJobResume } from "@/services/resumable_job.service";

/**
 * Info: (20260825 - Luphia) POST /api/v1/user/job/[job_id]/resume（issue #6714）：
 * 接續一個暫停中的任務。
 *
 * 回傳剩餘步驟，**執行由呼叫端進行**——內容在呼叫端手上（個人會話是端到端加密，
 * 伺服器沒有金鑰）。這一支不做餘額檢查：真正的判斷在執行時的扣款，
 * 而那一層才有鎖、才會真的動到錢。這裡先檢查一次會出現「檢查說夠、扣款說不夠」
 * 兩個答案，而使用者只會相信後者。
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
    const job = await startJobResume({ jobId, userId: user.id });
    return jsonOk(job);
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
