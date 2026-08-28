import { type JobPauseReason } from "@/constants/resumable_job";

/**
 * Info: (20260825 - Luphia) 可中斷任務的**驅動器**：純函式、不碰網路、不碰 React。
 *
 * ## 它要防的事故
 *
 * 溫盤報告匯入到一半點數用完。前端逐章迴圈的 `catch` 把每一個錯誤都推進
 * `failed`，於是：
 *
 * 1. 使用者看到「以下章節解析失敗」——而那些章**根本沒被解析過**。
 * 2. 迴圈不會停，剩下每一章都再撞一次 402，全部被列成失敗。
 * 3. 「重新匯入補齊」按下去，再撞一次同樣的牆。
 *
 * 三件事都源自同一個混淆：**把「做不了」當成「做壞了」**。
 *
 * ## 契約
 *
 * - 步驟的失敗分三類（`classifyStepOutcome`）：`PAUSE`（做不了，且原地可續）、
 *   `RETRY`（暫時性，同一趟裡可以再試）、`FAIL`（真的壞了，記下來繼續跑其他步驟）。
 * - 遇到第一個 `PAUSE` 就**停掉整趟**：剩餘步驟一步都不送，因為它們必然撞同一面牆，
 *   而每一次都要付一趟 RTT 與一次日誌雜訊。
 * - 停下來時剩餘步驟歸 `remaining`，**不是** `failed`。這是整支的重點。
 * - 已完成的步驟結果原樣回傳：接續時只跑 `remaining`，做過的不重做（也不重扣）。
 */

export const STEP_OUTCOME = {
  PAUSE: "PAUSE",
  RETRY: "RETRY",
  FAIL: "FAIL",
} as const;

export type StepOutcomeKind = (typeof STEP_OUTCOME)[keyof typeof STEP_OUTCOME];

export type StepOutcome =
  | { kind: typeof STEP_OUTCOME.PAUSE; reason: JobPauseReason }
  | { kind: typeof STEP_OUTCOME.RETRY }
  | { kind: typeof STEP_OUTCOME.FAIL };

export interface IResumableJobRun<TStep, TResult> {
  // Info: (20260825 - Luphia) 這一趟要跑的步驟（接續時只帶 remaining）
  steps: readonly TStep[];
  runStep: (step: TStep, index: number) => Promise<TResult>;
  /**
   * Info: (20260825 - Luphia) 把錯誤分類。呼叫端提供，因為「什麼算暫停」
   * 是各功能的計費語意——但**分類的形狀**由這裡定，避免每個功能各自發明。
   */
  classify: (error: unknown) => StepOutcome;
  // Info: (20260825 - Luphia) 同一趟裡的重試次數上限（`RETRY` 用）；預設 1 次
  maxRetriesPerStep?: number;
  /**
   * Info: (20260825 - Luphia) 併發數。溫盤匯入用 2（11 章耗時約減半，
   * 仍留 LLM 限流餘裕）。併發會讓「第一個 PAUSE」有一小段時間差——
   * 見下方 `pausedBy` 的說明。
   */
  concurrency?: number;
  // Info: (20260825 - Luphia) 每完成一步回報一次（畫面進度條用）
  onProgress?: (done: number, total: number) => void;
}

export interface IResumableJobOutcome<TStep, TResult> {
  results: { step: TStep; result: TResult }[];
  // Info: (20260825 - Luphia) 真的做壞了的步驟（可重試，且重試會真的送出去）
  failed: TStep[];
  /**
   * Info: (20260825 - Luphia) 一步都沒做的步驟。**不是失敗**：
   * 暫停時剩下的、以及併發中還沒輪到的都在這裡，補上點數後從這裡接續。
   */
  remaining: TStep[];
  // Info: (20260825 - Luphia) null＝沒有暫停（跑完了，可能含 failed）
  pausedBy: JobPauseReason | null;
}

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_MAX_RETRIES = 1;

export async function runResumableJob<TStep, TResult>(
  params: IResumableJobRun<TStep, TResult>,
): Promise<IResumableJobOutcome<TStep, TResult>> {
  const {
    steps,
    runStep,
    classify,
    maxRetriesPerStep = DEFAULT_MAX_RETRIES,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
  } = params;

  const results: { step: TStep; result: TResult }[] = [];
  const failed: TStep[] = [];
  const startedIndexes = new Set<number>();
  const settledIndexes = new Set<number>();
  let pausedBy: JobPauseReason | null = null;
  let cursor = 0;
  let done = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      // Info: (20260825 - Luphia) 已經暫停就不再領新步驟——剩下的留給接續
      if (pausedBy !== null) return;
      const index = cursor;
      if (index >= steps.length) return;
      cursor += 1;
      startedIndexes.add(index);
      const step = steps[index];

      let attempt = 0;
      for (;;) {
        try {
          const result = await runStep(step, index);
          results.push({ step, result });
          settledIndexes.add(index);
          break;
        } catch (error) {
          const outcome = classify(error);
          if (outcome.kind === STEP_OUTCOME.PAUSE) {
            /**
             * Info: (20260825 - Luphia) 併發下可能有兩步同時撞牆：**只認第一個**。
             * 兩者的原因通常相同，而即使不同（一個額度、一個要付款），
             * 先到的那個就是使用者接下來要處理的事——列兩個原因只會讓人不知道先做哪個。
             *
             * 這一步不進 `failed` 也不進 `settled`：它一步都沒做（`spendCredits`
             * 在呼叫 LLM 之前就丟出來），因此它屬於 `remaining`。
             */
            if (pausedBy === null) pausedBy = outcome.reason;
            return;
          }
          if (
            outcome.kind === STEP_OUTCOME.RETRY &&
            attempt < maxRetriesPerStep
          ) {
            attempt += 1;
            continue;
          }
          failed.push(step);
          settledIndexes.add(index);
          break;
        }
      }

      done += 1;
      onProgress?.(done, steps.length);
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker()),
  );

  /**
   * Info: (20260825 - Luphia) 剩餘＝**沒有結果**的步驟，而不是「游標之後的步驟」。
   *
   * 併發下這兩者不同：暫停發生時，另一條 worker 可能正跑在更前面的索引上，
   * 而那一步撞牆之後也沒有結果。以「有沒有結果」判斷，兩種都會被收進 remaining，
   * 順序也維持原本的步驟順序（接續時的視覺順序與第一次一致）。
   */
  const remaining = steps.filter((_step, index) => !settledIndexes.has(index));

  return { results, failed, remaining, pausedBy };
}
