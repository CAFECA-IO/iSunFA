import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { ollamaGenerate } from "@/lib/llm/ollama_generate";
import { runWithUsageCapture } from "@/lib/llm/usage_scope";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";

/**
 * Info: (20261022 - Luphia) 本機模型的用量回報接線。
 *
 * 企業觀測站 AI 諮詢的計費以這裡回報的 token 數結算；把 recordLlmUsage 那一行刪掉，
 * 這支測試要紅——否則就是「成本照付、額度不扣」（usage_scope.ts 記載的同類事故）。
 */

const fetchMock = jest.fn<typeof fetch>();
const originalFetch = global.fetch;

const params = {
  host: "http://ollama.test",
  model: "gemma4:e4b",
  prompt: "問題",
  temperature: 0,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("ollamaGenerate", () => {
  it("reports Ollama's own token counts to the capture scope", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        response: "答案",
        prompt_eval_count: 120,
        eval_count: 30,
      }),
    );
    const { result, usage } = await runWithUsageCapture(() =>
      ollamaGenerate(params),
    );
    expect(result).toBe("答案");
    expect(usage).toEqual({
      inputTokens: 120,
      outputTokens: 30,
      totalTokens: 150,
      callCount: 1,
    });
  });

  it("sends temperature and model as given", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ response: "{}" }));
    await ollamaGenerate({ ...params, format: "json" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://ollama.test/api/generate");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "gemma4:e4b",
      stream: false,
      format: "json",
      options: { temperature: 0 },
    });
  });

  it.each([
    [
      "unreachable",
      () => fetchMock.mockRejectedValue(new Error("ECONNREFUSED")),
    ],
    ["non-2xx", () => fetchMock.mockResolvedValue(jsonResponse({}, 500))],
    [
      "unexpected shape",
      () => fetchMock.mockResolvedValue(jsonResponse({ output: "x" })),
    ],
  ])("wraps %s as the business monitor LLM error", async (_label, arrange) => {
    arrange();
    const error = await ollamaGenerate(params).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(
      API_ERRORS.IS_BUSINESS_MONITOR_LLM_UNAVAILABLE.code,
    );
  });
});
