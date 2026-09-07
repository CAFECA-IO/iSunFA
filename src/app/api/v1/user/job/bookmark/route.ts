import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jobBookmarkPutSchema } from "@/validators";
import { saveJobBookmarkForChannel } from "@/services/resumable_job.service";

/**
 * Info: (20260825 - Luphia) PUT /api/v1/user/job/bookmark（issue #6712）：
 * 各功能在每一批步驟結束後寫回書籤。
 *
 * **付費團隊與下一步成本由伺服器推導**，不收呼叫端的值：
 * 前者決定「這筆消費算誰的」，後者決定掃描行程要不要把任務翻成「可以繼續」——
 * 兩個都讓呼叫端說了算的話，前端就能決定自己什麼時候被放行。
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const parsed = jobBookmarkPutSchema.safeParse(await request.json());
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);

    const job = await saveJobBookmarkForChannel({
      userId: user.id,
      /**
       * Info: (20260826 - Luphia) 所有權裁決在 Service（阻擋-1）：碳盤查的
       * `resourceKey` 是可推導的頻道，少了它任何登入者都能覆寫別人的書籤。
       * 與 `import/notice` 同一條規則。
       */
      address: user.address,
      ...parsed.data,
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
