// Info: (20260716 - Emily) LLM 同步路徑防護測試(#6515):timeout、用量記錄、錯誤分類、executor 路徑零改變

import { describe, it, expect, jest, afterEach } from "@jest/globals";
import {
  ChatService,
  isLlmTimeoutError,
  isLlmQuotaError,
} from "@/services/chat.service";
import {
  LLM_TIMEOUT_ERROR_MARKER,
  LLM_TEMPERATURE,
  LlmTaskKeyEnum,
} from "@/constants/llm";
import { logger } from "@/lib/utils/logger";

// Info: (20260716 - Emily) 以假 SDK 模型替換 genAI(私有欄位),不打真實 API
interface IFakeResponse {
  response: {
    text: () => string;
    usageMetadata?: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    };
  };
}

const buildService = (
  generateContent: () => Promise<IFakeResponse>,
): ChatService => {
  const service = new ChatService("fake-key");
  const fakeGenAI = {
    getGenerativeModel: () => ({ generateContent }),
  };
  Object.defineProperty(service, "genAI", { value: fakeGenAI });
  return service;
};

const okResponse = (text = "ok"): IFakeResponse => ({
  response: {
    text: () => text,
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 20,
      totalTokenCount: 30,
    },
  },
});

describe("ChatService sync-path guards (#6515)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("should complete normally within timeout and emit a usage log", async () => {
    const infoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
    const service = buildService(async () => okResponse("hello"));

    const result = await service.generateRaw("prompt", undefined, {
      timeoutMs: 1_000,
      taskKey: LlmTaskKeyEnum.PARAGRAPH_DRAFT,
    });

    expect(result).toBe("hello");
    const usageCall = infoSpy.mock.calls.find((c) => c[0] === "llm sync usage");
    expect(usageCall).toBeDefined();
    expect(usageCall?.[1]).toMatchObject({
      taskKey: LlmTaskKeyEnum.PARAGRAPH_DRAFT,
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      outcome: "success",
    });
  });

  it("should throw a timeout-recognizable error when the call hangs", async () => {
    jest.useFakeTimers();
    const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => {});
    const service = buildService(
      () => new Promise<IFakeResponse>(() => {}), // Info: (20260716 - Emily) 永不 resolve = hang
    );

    const promise = service.generateRaw("prompt", undefined, {
      timeoutMs: 5_000,
      taskKey: LlmTaskKeyEnum.CARBON_CHAT,
    });
    const assertion = expect(promise).rejects.toThrow(
      LLM_TIMEOUT_ERROR_MARKER,
    );
    await jest.advanceTimersByTimeAsync(5_001);
    await assertion;

    const usageCall = errorSpy.mock.calls.find(
      (c) => c[0] === "llm sync usage",
    );
    expect(usageCall?.[1]).toMatchObject({
      taskKey: LlmTaskKeyEnum.CARBON_CHAT,
      outcome: "timeout",
    });
  });

  it("should not emit usage logs nor timeout without guards (executor path unchanged)", async () => {
    const infoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
    const service = buildService(async () => okResponse("raw"));

    const result = await service.generateRaw("prompt");

    expect(result).toBe("raw");
    expect(
      infoSpy.mock.calls.find((c) => c[0] === "llm sync usage"),
    ).toBeUndefined();
  });

  it("should classify timeout vs quota errors distinctly", () => {
    const timeoutError = new Error(`${LLM_TIMEOUT_ERROR_MARKER}: exceeded 45000ms`);
    const quotaError = new Error("429 RESOURCE_EXHAUSTED: quota");
    expect(isLlmTimeoutError(timeoutError)).toBe(true);
    expect(isLlmQuotaError(timeoutError)).toBe(false);
    expect(isLlmTimeoutError(quotaError)).toBe(false);
    expect(isLlmQuotaError(quotaError)).toBe(true);
    expect(isLlmTimeoutError("not-an-error")).toBe(false);
  });

  it("should expose single-source temperature constants", () => {
    // Info: (20260716 - Emily) 護欄:溫度單一來源(萃取可重現性依賴 EXTRACTION = 0)
    expect(LLM_TEMPERATURE.EXTRACTION).toBe(0);
    expect(LLM_TEMPERATURE.CHAT).toBe(0.2);
  });
});
