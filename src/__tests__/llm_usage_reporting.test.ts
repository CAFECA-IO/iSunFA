import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { ChatService } from "@/services/chat.service";
import { runWithUsageCapture } from "@/lib/llm/usage_scope";

/**
 * Info: (20260814 - Luphia) LLM 用量回報的**接線**測試（PR #6652 review B-5 #1）。
 *
 * `chat.service` 內那一行 `recordLlmUsage(...)` 是整套計量計費的唯一資料來源，
 * 但先前沒有任何測試碰到它：碳盤查的服務測試在自己的 stub 裡呼叫 `recordLlmUsage`
 * 灌用量，`llm_usage_scope.test.ts` 測的是 lib 本身。
 *
 * 也就是說，把那一行刪掉，全庫依然全綠——而線上行為會變成
 * 每一次呼叫都回報 0 tokens，`settleFaithCredits(0)` 收斂為 1 點，
 * 一次 5 萬 tokens 的匯入只收 1 點。這支測試就是為了讓那個 mutation 變紅。
 */

/**
 * Info: (20260814 - Luphia) 明確標註替身的回傳型別：jest.fn() 預設推導成 never，
 * mockResolvedValue 會被 tsc 擋下（本專案 test 也走型別檢查）。
 */
const generateContentMock = jest.fn<() => Promise<unknown>>();

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: generateContentMock,
    })),
  })),
  // Info: (20260814 - Luphia) chat.service 會實際讀這些列舉值（截斷偵測用 FinishReason）
  HarmCategory: {},
  HarmBlockThreshold: {},
  SchemaType: {},
  FinishReason: { MAX_TOKENS: "MAX_TOKENS", STOP: "STOP" },
}));

function mockSdkResponse(usage: {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}) {
  generateContentMock.mockResolvedValue({
    response: {
      usageMetadata: usage,
      text: () => "ok",
      candidates: [{ finishReason: "STOP", content: { parts: [] } }],
    },
  });
}

describe("llm usage reporting", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  /**
   * Info: (20260814 - Luphia) 建構子傳入金鑰即短路系統設定查詢（見 ensureClient 註解），
   * 因此這支測試不碰資料庫。
   */
  it("reports the SDK usage into the surrounding capture scope", async () => {
    mockSdkResponse({
      promptTokenCount: 1200,
      candidatesTokenCount: 800,
      totalTokenCount: 2000,
    });
    const service = new ChatService("test-key");

    const captured = await runWithUsageCapture(async () => {
      await service.generateContentWithUsage([{ text: "hello" }]);
      return null;
    });

    expect(captured.usage.totalTokens).toBe(2000);
    expect(captured.usage.inputTokens).toBe(1200);
    expect(captured.usage.outputTokens).toBe(800);
    expect(captured.usage.callCount).toBe(1);
  });

  /**
   * Info: (20260814 - Luphia) fan-out 的每一次呼叫都要累加：
   * 匯入逐章十餘次呼叫，只記第一次等於少收一個數量級。
   */
  it("accumulates every call inside one scope", async () => {
    mockSdkResponse({
      promptTokenCount: 100,
      candidatesTokenCount: 100,
      totalTokenCount: 200,
    });
    const service = new ChatService("test-key");

    const captured = await runWithUsageCapture(async () => {
      await service.generateContentWithUsage([{ text: "a" }]);
      await service.generateContentWithUsage([{ text: "b" }]);
      await service.generateContentWithUsage([{ text: "c" }]);
      return null;
    });

    expect(captured.usage.callCount).toBe(3);
    expect(captured.usage.totalTokens).toBe(600);
  });

  // Info: (20260814 - Luphia) SDK 未回報 usageMetadata 時記 0，不憑空推估（設計書 §5.5）
  it("records zero rather than guessing when the SDK omits usage", async () => {
    generateContentMock.mockResolvedValue({
      response: { text: () => "ok", candidates: [] },
    });
    const service = new ChatService("test-key");

    const captured = await runWithUsageCapture(async () => {
      await service.generateContentWithUsage([{ text: "hello" }]);
      return null;
    });

    expect(captured.usage.totalTokens).toBe(0);
    expect(captured.usage.callCount).toBe(1);
  });
});
