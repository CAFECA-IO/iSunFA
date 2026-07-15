// Info: (20260714 - Emily) Carbon Chatbot 段落草稿生成端點(純端口:授權 → 驗證 → 呼叫 Service → 格式化回應)

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { CarbonParagraphDraftRequestSchema } from "@/validators";
import { ParagraphDraftService } from "@/services/paragraph_draft.service";

export async function POST(request: NextRequest) {
  // Info: (20260714 - Emily) DeWT 授權:比照 history route(生成消耗 LLM 資源,未登入一律拒絕)
  const sessionUser = await getIdentityFromDeWT(
    request.headers.get("Authorization"),
  );
  if (!sessionUser) {
    return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
  }

  // Info: (20260716 - Emily) 限流(#6516):DeWT 驗證後、業務邏輯前 Fail Fast
  const limited = enforceCarbonRateLimit(
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
    const draft = await service.generateParagraphDraft(parsed.data);
    return jsonOk(draft);
  } catch (error) {
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
