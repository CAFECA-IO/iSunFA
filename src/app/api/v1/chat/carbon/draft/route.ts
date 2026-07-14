// Info: (20260714 - Emily) Carbon Chatbot 段落草稿生成端點(純端口:驗證 → 呼叫 Service → 格式化回應)
// ToDo: (20260714 - Emily) 比照 history route 加上 DeWT 授權檢查(與 /api/v1/chat/carbon 主路由一併處理)

import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { CarbonParagraphDraftRequestSchema } from "@/validators";
import { ParagraphDraftService } from "@/services/paragraph_draft.service";

export async function POST(request: NextRequest) {
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
    console.error("[API] /chat/carbon/draft error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
