import { AsyncLocalStorage } from "async_hooks";

/**
 * Info: (20260813 - Luphia) LLM 用量捕捉範圍（設計書 §5.5）。
 *
 * 碳盤查的重成本路徑不是「一次呼叫」而是**管線**：附件萃取一次、每個段落草稿各一次、
 * 整份報告匯入逐章各一次（實測單章 5 萬 tokens）。要對這種 fan-out 計費，
 * 逐層回傳 usage 等於把萃取、草稿、匯入、結構圖四條服務的簽名全部改一遍，
 * 而且只要有人新增一個 LLM 呼叫忘了往上傳，那次用量就靜靜地不計費。
 *
 * 改用 AsyncLocalStorage：`invokeGuarded`（`ChatService` 內所有模型呼叫的共同入口）
 * 在每次成功後把用量加進當前範圍，計費層只要用 `runWithUsageCapture()` 包住整條管線
 * 即可拿到總量。管線**內部**新增的呼叫點自動被涵蓋。
 *
 * Info: (20260814 - Luphia) 但「包住管線」這一步仍然要有人記得做（PR #6652 review B-1）：
 * 段落草稿端點就漏了近一個月——它確實會 recordLlmUsage，只是不在任何範圍內，
 * 於是被下方的 `if (!scope) return` 直接吞掉，成本照付、額度不扣。
 * 現由 `carbon_billing_coverage.test.ts` 守住：碳盤查的 LLM 端點沒接計費就會紅。
 *
 * 另需注意 `business_monitor.service` 直接呼叫 SDK、不經 `invokeGuarded`
 * （背景監控，不在計費情境）——因此這裡說的是「ChatService 的共同入口」，
 * 而不是「全系統唯一入口」。
 *
 * 範圍外呼叫（executor、背景 worker）不受影響：沒有範圍時 record 是 no-op。
 */

export interface ICapturedLlmUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  // Info: (20260813 - Luphia) 呼叫次數：用於觀測 fan-out 規模（匯入一次可達十餘次）
  callCount: number;
}

const storage = new AsyncLocalStorage<ICapturedLlmUsage>();

/**
 * Info: (20260813 - Luphia) 累加一次 LLM 呼叫的用量；不在捕捉範圍內時為 no-op。
 * 由 ChatService.invokeGuarded 呼叫，其他地方不應直接使用。
 */
export function recordLlmUsage(usage: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}): void {
  const scope = storage.getStore();
  if (!scope) return;
  scope.inputTokens += usage.inputTokens ?? 0;
  scope.outputTokens += usage.outputTokens ?? 0;
  scope.totalTokens += usage.totalTokens ?? 0;
  scope.callCount += 1;
}

/**
 * Info: (20260813 - Luphia) 在捕捉範圍內執行一段工作，回傳結果與該範圍內的總用量。
 * 工作拋錯時用量隨錯誤一起丟棄——失敗的管線由呼叫端全額退還預扣（§5.2），
 * 不需要也不應該按已燒掉的 tokens 計費。
 */
export async function runWithUsageCapture<T>(
  work: () => Promise<T>,
): Promise<{ result: T; usage: ICapturedLlmUsage }> {
  const scope: ICapturedLlmUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    callCount: 0,
  };
  const result = await storage.run(scope, work);
  return { result, usage: scope };
}
