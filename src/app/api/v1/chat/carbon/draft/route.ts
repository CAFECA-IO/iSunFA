// Info: (20260714 - Emily) Carbon Chatbot 段落草稿生成端點(純端口:授權 → 驗證 → 呼叫 Service → 格式化回應)

import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { CarbonParagraphDraftRequestSchema } from "@/validators";
import { ParagraphDraftService } from "@/services/paragraph_draft.service";
import { runBilledCarbonTask } from "@/services/carbon_billing.service";
import { toBillingFailureResponse } from "@/lib/utils/billing_response";

export async function POST(request: NextRequest) {
  // Info: (20260714 - Emily) DeWT 授權:比照 history route(生成消耗 LLM 資源,未登入一律拒絕)
  const sessionUser = await getIdentityFromDeWT(
    request.headers.get("Authorization"),
  );
  if (!sessionUser) {
    return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
  }

  // Info: (20260716 - Emily) 限流(#6516):DeWT 驗證後、業務邏輯前 Fail Fast
  const limited = enforceRateLimit(
    sessionUser.address,
    RateLimitBucketEnum.LLM,
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail(API_ERRORS.VL_INVALID_JSON);
  }

  const parsed = CarbonParagraphDraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
  }

  try {
    const service = new ParagraphDraftService();
    /**
     * Info: (20260814 - Luphia) 段落草稿與修訂納入計費（PR #6652 review B-1）。
     *
     * 這是碳盤查的**第五條** LLM 路徑，先前漏接：它底下確實會呼叫 recordLlmUsage，
     * 但不在任何 runWithUsageCapture 範圍內，用量被 usage_scope 直接吞掉——
     * 也就是說使用者按一次「生成草稿」，模型成本照付、額度一點都不扣。
     * 條款 §「各項人工智慧作業均依實際使用量計費」在這條路徑上原本不成立。
     */
    const contextChars = parsed.data.conversationContext.reduce(
      (sum, item) => sum + item.text.length,
      0,
    );
    const inputChars =
      contextChars +
      (parsed.data.existingContent?.length ?? 0) +
      (parsed.data.instruction?.length ?? 0);

    const billed = await runBilledCarbonTask({
      userId: sessionUser.id,
      channel: parsed.data.channel,
      idempotencyKey: parsed.data.clientMessageId
        ? `carbon-draft:${sessionUser.id}:${parsed.data.clientMessageId}`
        : `carbon-draft:${randomUUID()}`,
      inputChars,
      hasAttachment: false,
      nowSec: Math.floor(Date.now() / 1000),
      run: () => service.generateParagraphDraft(parsed.data),
    });
    return jsonOk(billed.result);
  } catch (error) {
    // Info: (20260814 - Luphia) 額度不足 / 需個人付款一律回結構化 402，前端據此提示
    const billingFailure = toBillingFailureResponse(error);
    if (billingFailure) return billingFailure;
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error(`[API] /chat/carbon/draft error: ${JSON.stringify(error)}`);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
