import { z } from "zod";

/**
 * Info: (20261022 - Luphia) 本機 Ollama `/api/generate`（stream: false）的回應。
 *
 * 只宣告用得到的欄位。`prompt_eval_count` / `eval_count` 是 Ollama 自己數的 token 數，
 * 計費以它們為準（決定論來源，不採信模型自報）；舊版或快取命中時可能缺席，缺席即視為 0。
 */
export const ollamaGenerateResponseSchema = z.object({
  response: z.string(),
  prompt_eval_count: z.number().int().nonnegative().optional(),
  eval_count: z.number().int().nonnegative().optional(),
});

export type IOllamaGenerateResponse = z.infer<
  typeof ollamaGenerateResponseSchema
>;
