import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail, jsonFailWithPayload } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { faithChatSchema } from "@/validators";
import { ChatService } from "@/services/chat.service";
import { runFaithBilledChat } from "@/services/faith_chat.service";
import { QuotaExceededError } from "@/services/spend.service";

/**
 * Info: (20260807 - Luphia) 費思對話（設計書 §5.3）。route 為純端口：
 * 驗證 → 認證 → 限流 → 呼叫 service → 回應映射；
 * 計費業務流程（預扣—結算）收斂於 faith_chat.service。
 * 試用路徑（未登入或未帶帳本）：不扣點，server-side 限流（FAITH_GUEST bucket）。
 *
 * Info: (20260812 - Luphia) 計費情境由 accountBookId 決定（設計書 §5.3「使用前提」）：
 * 費思僅在選定帳本後可用，扣費團隊由 service 以 AccountBook.teamId 推導並驗權。
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = faithChatSchema.safeParse(await request.json());
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    const { message, tags, file, mimeType, accountBookId, clientMessageId } =
      parsed.data;

    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user || !accountBookId) {
      // Info: (20260807 - Luphia) 訪客試用：以 address 或來源 IP 限流，不進計費管線
      const identity =
        user?.address ??
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown";
      const limited = enforceCarbonRateLimit(
        identity,
        RateLimitBucketEnum.FAITH_GUEST,
      );
      if (limited) return limited;

      const chatService = new ChatService();
      const reply = await chatService.generateResponse(
        message,
        tags,
        file,
        mimeType,
      );
      return jsonOk({ reply, billing: null });
    }

    const result = await runFaithBilledChat({
      userId: user.id,
      accountBookId,
      message,
      tags,
      file,
      mimeType,
      clientMessageId,
      nowSec: Math.floor(Date.now() / 1000),
    });
    return jsonOk(result);
  } catch (error) {
    console.error("[API] /chat error:", error);
    if (error instanceof QuotaExceededError) {
      return jsonFailWithPayload(API_ERRORS.TW_QUOTA_EXCEEDED, error.data);
    }
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
