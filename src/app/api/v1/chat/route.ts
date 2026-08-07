import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail, jsonFailWithPayload } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { BILLABLE_FEATURE_CODE } from "@/constants/subscription_quota";
import { FAITH_TOKENS_PER_CREDIT } from "@/constants/llm";
import {
  estimateFaithHoldCredits,
  settleFaithCredits,
} from "@/lib/faith_billing";
import { faithChatSchema } from "@/validators";
import { ChatService } from "@/services/chat.service";
import {
  QuotaExceededError,
  refundCredits,
  settleSpend,
  spendCredits,
} from "@/services/spend.service";

/**
 * Info: (20260807 - Luphia) 費思對話（設計書 §5.3）。
 * 計費路徑（DeWT + teamId）：預扣（輸入估算 + maxOutputTokens 上界）→ 呼叫 LLM →
 * 以 usageMetadata.totalTokenCount 結算退差額；LLM 失敗全額退還。
 * 試用路徑（未登入或未帶 teamId）：不扣點，server-side 限流（FAITH_GUEST bucket）。
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = faithChatSchema.safeParse(await request.json());
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    const { message, tags, file, mimeType, teamId, clientMessageId } =
      parsed.data;

    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    const chatService = new ChatService();

    if (!user || !teamId) {
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

      const reply = await chatService.generateResponse(
        message,
        tags,
        file,
        mimeType,
      );
      return jsonOk({ reply, billing: null });
    }

    // Info: (20260807 - Luphia) 1. 預扣：hold 為成本上界，保證結算只退不補
    const idempotencyKey = clientMessageId
      ? `faith:${user.id}:${clientMessageId}`
      : `faith:${randomUUID()}`;
    const holdCredits = estimateFaithHoldCredits(message.length, Boolean(file));
    const nowSec = Math.floor(Date.now() / 1000);

    try {
      await spendCredits({
        teamId,
        userId: user.id,
        featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
        cost: holdCredits,
        idempotencyKey,
        nowSec,
      });
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return jsonFailWithPayload(API_ERRORS.TW_QUOTA_EXCEEDED, error.data);
      }
      throw error;
    }

    // Info: (20260807 - Luphia) 2. 呼叫 LLM；失敗即全額退還預扣，不留懸帳
    let generation: Awaited<ReturnType<ChatService["generateFaithResponse"]>>;
    try {
      generation = await chatService.generateFaithResponse(
        message,
        tags,
        file,
        mimeType,
      );
    } catch (llmError) {
      await refundCredits({ idempotencyKey, operatorUserId: user.id });
      throw llmError;
    }

    // Info: (20260807 - Luphia) 3. 結算：以 SDK usageMetadata 為準，最低 1 點
    const actualCredits = settleFaithCredits(generation.usage.totalTokens);
    const settlement = await settleSpend({
      idempotencyKey,
      actualCost: actualCredits,
      operatorUserId: user.id,
    });

    return jsonOk({
      reply: generation.text,
      billing: {
        idempotencyKey,
        source: settlement.source,
        held: settlement.held,
        charged: settlement.charged,
        refunded: settlement.refunded,
        totalTokens: generation.usage.totalTokens,
        tokensPerCredit: FAITH_TOKENS_PER_CREDIT,
      },
    });
  } catch (error) {
    console.error("[API] /chat error:", error);
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
