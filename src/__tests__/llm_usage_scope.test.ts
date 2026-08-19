import { describe, it, expect } from "@jest/globals";
import { recordLlmUsage, runWithUsageCapture } from "@/lib/llm/usage_scope";

/**
 * Info: (20260813 - Luphia) LLM 用量捕捉範圍測試（設計書 §5.5）。
 *
 * 這一層是碳盤查重成本路徑能計費的前提：匯入一次 fan-out 到十餘次 LLM 呼叫，
 * 逐層回傳 usage 會漏、會忘；捕捉範圍讓「新增的呼叫自動被計費」成為預設。
 */

describe("runWithUsageCapture", () => {
  it("sums every call made inside the scope", async () => {
    const { result, usage } = await runWithUsageCapture(async () => {
      recordLlmUsage({ inputTokens: 100, outputTokens: 50, totalTokens: 150 });
      recordLlmUsage({ inputTokens: 200, outputTokens: 80, totalTokens: 280 });
      return "done";
    });

    expect(result).toBe("done");
    expect(usage).toEqual({
      inputTokens: 300,
      outputTokens: 130,
      totalTokens: 430,
      callCount: 2,
    });
  });

  it("captures calls made from nested async work", async () => {
    const nested = async () => {
      await Promise.resolve();
      recordLlmUsage({ totalTokens: 40 });
    };

    const { usage } = await runWithUsageCapture(async () => {
      await Promise.all([nested(), nested(), nested()]);
      return null;
    });

    // Info: (20260813 - Luphia) 匯入與附件管線都是這種並行 fan-out，漏掉任何一支就是漏計費
    expect(usage.totalTokens).toBe(120);
    expect(usage.callCount).toBe(3);
  });

  it("reports zero when the work makes no LLM call", async () => {
    const { usage } = await runWithUsageCapture(async () => "no llm");
    expect(usage.totalTokens).toBe(0);
    expect(usage.callCount).toBe(0);
  });

  /**
   * Info: (20260813 - Luphia) 範圍外呼叫是 no-op：executor 與背景 worker 不經計費層，
   * 若在這裡拋錯或全域累加，它們會被別人的帳單吃掉。
   */
  it("is a no-op outside any scope", () => {
    expect(() => recordLlmUsage({ totalTokens: 999 })).not.toThrow();
  });

  it("keeps concurrent scopes isolated", async () => {
    const [first, second] = await Promise.all([
      runWithUsageCapture(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        recordLlmUsage({ totalTokens: 10 });
        return "a";
      }),
      runWithUsageCapture(async () => {
        recordLlmUsage({ totalTokens: 70 });
        return "b";
      }),
    ]);

    // Info: (20260813 - Luphia) 兩個請求同時跑時各記各的帳，絕不互相污染
    expect(first.usage.totalTokens).toBe(10);
    expect(second.usage.totalTokens).toBe(70);
  });

  it("propagates the error and bills nothing when the work fails", async () => {
    await expect(
      runWithUsageCapture(async () => {
        recordLlmUsage({ totalTokens: 500 });
        throw new Error("pipeline exploded");
      }),
    ).rejects.toThrow("pipeline exploded");
  });
});
