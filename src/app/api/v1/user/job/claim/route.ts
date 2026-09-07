import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { claimJobForChannel } from "@/services/resumable_job.service";
import { jobClaimPostSchema } from "@/validators";

/**
 * Info: (20260827 - Luphia) POST /api/v1/user/job/claim（issue #6721）：
 * 換一把**會過期的**執行許可。
 *
 * 要防的事很具體：同一個帳號開兩個分頁（很常見——第一個看起來卡住了才開第二個），
 * 補點數之後兩邊都跳出「可以繼續」，兩邊都按下去 → 同一批份送兩次 →
 * **點數扣兩次**（一份 2MB 的 PDF 單次預扣估算約 677 點）。
 *
 * 按**資源**而不是按任務 id：客戶端手上只有頻道，任務 id 在伺服器。要它先查
 * 一次 id 再來換許可，等於在最要緊的路徑上多一個往返，而那個往返本身又是一個
 * 競態窗口。
 *
 * 回 null（`payload` 為 null）不是失敗：`intent = START` 而這個資源上還沒有
 * 書籤（第一次匯入）或上一個已經做完，都是正常的——那時許可等於「你可以開始」。
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const parsed = jobClaimPostSchema.safeParse(await request.json());
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);

    const job = await claimJobForChannel({
      userId: user.id,
      // Info: (20260827 - Luphia) 所有權裁決用：頻道前綴必須是這個人的位址
      address: user.address,
      type: parsed.data.type,
      resourceKey: parsed.data.resourceKey,
      intent: parsed.data.intent,
      nowMs: Date.now(),
    });
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
