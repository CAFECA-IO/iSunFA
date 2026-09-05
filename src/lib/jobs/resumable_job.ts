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
  /**
   * Info: (20260904 - Emily) `afterMs`:至少等這麼久再重試(#6744)。
   * 429 的 `Retry-After` 走這裡。**它推的是整趟的閘門,不只是這一步**:
   * 限流是以身分計的共用 bucket,一步撞牆代表所有 worker 都該退 ——
   * 讓另一條 worker 立刻補上只會再撞一次,而且把 retryAfter 越推越大
   *(實測一路升到 46 秒)。
   */
  | { kind: typeof STEP_OUTCOME.RETRY; afterMs?: number }
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
  /**
   * Info: (20260904 - Emily) 步驟**開始**之間的最小間隔,跨所有 worker(#6744)。
   *
   * `concurrency` 限的是「同時在飛」的數量,**不限「每分鐘發出」的速率** ——
   * 每一步幾百毫秒回來(來源快取命中時),下一步立刻補上,一秒內就能發出十幾步,
   * 而 LLM bucket 是 12/分鐘。同一份檔第二次匯入因此必掛(第一次過得了,
   * 是因為每章都要等 PDF 抽字,呼叫被自然拉開)。
   *
   * 重試也是一次「開始」,同樣過這道閘。省略或 0 = 不節流(既有行為不變)。
   */
  minStartIntervalMs?: number;
  /**
   * Info: (20260904 - Emily) 時鐘與睡眠可注入,讓節流與退避**測得到**而不必碰 fake timers。
   * 純函式的立場不變:預設就是 Date.now 與 setTimeout,呼叫端不需要知道這兩個欄位。
   */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
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
const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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
    minStartIntervalMs = 0,
    now = Date.now,
    sleep = defaultSleep,
  } = params;

  const results: { step: TStep; result: TResult }[] = [];
  const failed: TStep[] = [];
  const startedIndexes = new Set<number>();
  const settledIndexes = new Set<number>();
  let pausedBy: JobPauseReason | null = null;
  let cursor = 0;
  let done = 0;

  /**
   * Info: (20260904 - Emily) 全趟共用的閘門:`gateOpenAt` 之前誰都不能開始下一步。
   *
   * ## 為什麼是「醒來再看一次」而不是「先佔位再睡」
   *
   * 第一版寫成佔位(把時刻往後推)之後睡到自己的位子。那有一個洞,測試抓到的:
   * worker B 佔了 t=100 的位子在睡,worker A 在 t=0 撞 429、把閘門推到 t=1000 ——
   * B 在 100 醒來照樣送出去,因為它的位子是撞牆**之前**佔的。生產環境的表現是
   * 每一次撞牆多付一次 429(上限 = 併發數),而伺服端的 retryAfter 被越推越大。
   *
   * 改成迴圈:醒來之後**重看**閘門,沒開就再睡到它開。同一瞬間兩條 worker 都醒,
   * 先跑的那條把閘門推走,後跑的看到沒開、再睡一段 —— 節流靠的是這個順序,
   * 不靠任何鎖。`minStartIntervalMs` 為 0 時閘門推到「現在」,等於不節流,
   * 但退避仍然有效:honor `Retry-After` 不該以有沒有開節流為前提。
   */
  let gateOpenAt = 0;
  const waitForStartSlot = async (): Promise<void> => {
    for (;;) {
      const current = now();
      if (current >= gateOpenAt) {
        gateOpenAt = current + minStartIntervalMs;
        return;
      }
      await sleep(gateOpenAt - current);
    }
  };
  /**
   * Info: (20260904 - Emily) 撞牆的退避推的是**整趟**的閘門(理由見 StepOutcome.afterMs)。
   * 只往後推不往前拉:兩步同時撞、回報不同秒數時,取較晚的那個。
   */
  const backOffAll = (afterMs: number): void => {
    gateOpenAt = Math.max(gateOpenAt, now() + afterMs);
  };

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
        // Info: (20260904 - Emily) 每一次開始(含重試)都過同一道閘
        await waitForStartSlot();
        // Info: (20260904 - Emily) 排隊期間別人撞牆暫停了,這一步就不要再送出去
        if (pausedBy !== null) return;
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
            if (outcome.afterMs !== undefined && outcome.afterMs > 0) {
              backOffAll(outcome.afterMs);
            }
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
