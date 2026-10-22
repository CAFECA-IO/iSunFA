import { recordLlmUsage } from "@/lib/llm/usage_scope";
import { ollamaGenerateResponseSchema } from "@/validators";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20261022 - Luphia) 呼叫本機 Ollama `/api/generate` 並把用量回報給計費範圍。
 *
 * `ChatService.invokeGuarded` 只包得住 Gemini SDK 的回傳型別，本機模型不經過它；
 * 少了這一步，AI 諮詢在 `runWithUsageCapture` 範圍內跑完，用量卻是 0——
 * 與 usage_scope.ts 提到的段落草稿漏接是同一種「成本照付、額度不扣」。
 *
 * 連不上、非 2xx、回應格式不符一律包成 IS_BUSINESS_MONITOR_LLM_UNAVAILABLE，
 * 不讓 fetch 或 zod 的原始錯誤噴到前端。
 */
export interface IOllamaGenerateParams {
  host: string;
  model: string;
  prompt: string;
  temperature: number;
  // Info: (20261022 - Luphia) 傳 "json" 時 Ollama 以 JSON 模式約束輸出
  format?: "json";
}

function unavailable(): ApiError {
  const def = API_ERRORS.IS_BUSINESS_MONITOR_LLM_UNAVAILABLE;
  return new ApiError(def.code, def.message, def.status);
}

export async function ollamaGenerate(
  params: IOllamaGenerateParams,
): Promise<string> {
  let body: unknown;
  try {
    const response = await fetch(`${params.host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: params.model,
        prompt: params.prompt,
        stream: false,
        format: params.format,
        options: { temperature: params.temperature },
      }),
    });
    if (!response.ok) {
      logger.error("ollama generate failed", {
        model: params.model,
        status: response.status,
      });
      throw unavailable();
    }
    body = await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("ollama generate unreachable", {
      model: params.model,
      error: error instanceof Error ? error.message : String(error),
    });
    throw unavailable();
  }

  const parsed = ollamaGenerateResponseSchema.safeParse(body);
  if (!parsed.success) {
    logger.error("ollama generate returned unexpected shape", {
      model: params.model,
    });
    throw unavailable();
  }

  const inputTokens = parsed.data.prompt_eval_count ?? 0;
  const outputTokens = parsed.data.eval_count ?? 0;
  recordLlmUsage({
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  });
  return parsed.data.response;
}
