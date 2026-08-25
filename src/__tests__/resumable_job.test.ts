import { describe, it, expect } from "@jest/globals";
import {
  runResumableJob,
  STEP_OUTCOME,
  type StepOutcome,
} from "@/lib/jobs/resumable_job";
import { JOB_PAUSE_REASON } from "@/constants/resumable_job";

/**
 * Info: (20260825 - Luphia) 可中斷任務驅動器的不變式。
 *
 * 這支守的是一句話：**暫停不是失敗**。它算錯不會噴錯——只會讓使用者看到
 * 「以下章節解析失敗」，而那些章其實一步都沒跑過（點數用完，`spendCredits`
 * 在呼叫 LLM 之前就擋下了）。兩者的處置完全相反：失敗要重試，
 * 暫停要停下來並告訴使用者怎麼補點數。
 */

const PAUSE_CREDITS: StepOutcome = {
  kind: STEP_OUTCOME.PAUSE,
  reason: JOB_PAUSE_REASON.CREDITS_EXHAUSTED,
};

class StepError extends Error {
  constructor(public kind: "pause" | "retry" | "fail") {
    super(kind);
  }
}

function classify(error: unknown): StepOutcome {
  const kind = error instanceof StepError ? error.kind : "fail";
  if (kind === "pause") return PAUSE_CREDITS;
  if (kind === "retry") return { kind: STEP_OUTCOME.RETRY };
  return { kind: STEP_OUTCOME.FAIL };
}

describe("全部成功", () => {
  it("回傳每一步的結果，沒有剩餘也沒有暫停", async () => {
    const outcome = await runResumableJob({
      steps: ["a", "b", "c"],
      runStep: async (step) => `${step}!`,
      classify,
      concurrency: 1,
    });

    expect(outcome.results.map((entry) => entry.result)).toEqual([
      "a!",
      "b!",
      "c!",
    ]);
    expect(outcome.failed).toEqual([]);
    expect(outcome.remaining).toEqual([]);
    expect(outcome.pausedBy).toBeNull();
  });

  it("回報進度", async () => {
    const seen: number[] = [];
    await runResumableJob({
      steps: ["a", "b"],
      runStep: async () => null,
      classify,
      concurrency: 1,
      onProgress: (done) => seen.push(done),
    });

    expect(seen).toEqual([1, 2]);
  });
});

describe("暫停：整支的重點", () => {
  /**
   * Info: (20260825 - Luphia) 撞牆的那一步**不算失敗**，它一步都沒做。
   * 它與其後的步驟一起進 remaining，補上點數後從原地接續。
   */
  it("撞牆的步驟與其後的步驟都進 remaining，不進 failed", async () => {
    const attempted: string[] = [];
    const outcome = await runResumableJob({
      steps: ["a", "b", "c", "d"],
      runStep: async (step) => {
        attempted.push(step);
        if (step === "b") throw new StepError("pause");
        return step;
      },
      classify,
      concurrency: 1,
    });

    expect(outcome.pausedBy).toBe(JOB_PAUSE_REASON.CREDITS_EXHAUSTED);
    expect(outcome.failed).toEqual([]);
    expect(outcome.remaining).toEqual(["b", "c", "d"]);
    expect(outcome.results.map((entry) => entry.step)).toEqual(["a"]);
  });

  /**
   * Info: (20260825 - Luphia) 剩下的步驟**一步都不送**。
   *
   * 這一條擋的是原本的行為：迴圈不會停，剩餘每一章都各撞一次 402，
   * 於是全部被列成解析失敗——而每一次都白付一趟 RTT。
   */
  it("暫停之後不再送出任何步驟", async () => {
    const attempted: string[] = [];
    await runResumableJob({
      steps: ["a", "b", "c", "d", "e"],
      runStep: async (step) => {
        attempted.push(step);
        if (step === "a") throw new StepError("pause");
        return step;
      },
      classify,
      concurrency: 1,
    });

    expect(attempted).toEqual(["a"]);
  });

  // Info: (20260825 - Luphia) 併發下兩步同時撞牆：只認第一個原因，不列兩個
  it("併發時只記一個暫停原因", async () => {
    const outcome = await runResumableJob({
      steps: ["a", "b", "c", "d"],
      runStep: async () => {
        throw new StepError("pause");
      },
      classify,
      concurrency: 2,
    });

    expect(outcome.pausedBy).toBe(JOB_PAUSE_REASON.CREDITS_EXHAUSTED);
    expect(outcome.failed).toEqual([]);
    // Info: (20260825 - Luphia) 兩條 worker 各領一步，兩步都沒有結果 → 都在 remaining
    expect(outcome.remaining).toEqual(["a", "b", "c", "d"]);
  });

  /**
   * Info: (20260825 - Luphia) 併發下的 remaining 以「有沒有結果」判斷，
   * 不是「游標之後」：暫停發生時另一條 worker 可能正跑在更前面的索引上，
   * 而那一步也沒有結果。順序維持原本的步驟順序。
   */
  it("併發時較晚的步驟已完成，較早的撞牆 → 只有撞牆那步在 remaining", async () => {
    const outcome = await runResumableJob({
      steps: ["slow-pause", "fast-ok"],
      runStep: async (step) => {
        if (step === "slow-pause") {
          await new Promise((resolve) => {
            setTimeout(resolve, 10);
          });
          throw new StepError("pause");
        }
        return step;
      },
      classify,
      concurrency: 2,
    });

    expect(outcome.results.map((entry) => entry.step)).toEqual(["fast-ok"]);
    expect(outcome.remaining).toEqual(["slow-pause"]);
    expect(outcome.failed).toEqual([]);
  });
});

describe("失敗與重試", () => {
  // Info: (20260825 - Luphia) 真的做壞了：記進 failed，但**其他步驟照跑**
  it("失敗的步驟不會停掉整趟", async () => {
    const outcome = await runResumableJob({
      steps: ["a", "b", "c"],
      runStep: async (step) => {
        if (step === "b") throw new StepError("fail");
        return step;
      },
      classify,
      concurrency: 1,
    });

    expect(outcome.failed).toEqual(["b"]);
    expect(outcome.results.map((entry) => entry.step)).toEqual(["a", "c"]);
    expect(outcome.remaining).toEqual([]);
    expect(outcome.pausedBy).toBeNull();
  });

  it("暫時性失敗在同一趟裡重試，成功就不算失敗", async () => {
    let attempts = 0;
    const outcome = await runResumableJob({
      steps: ["a"],
      runStep: async (step) => {
        attempts += 1;
        if (attempts === 1) throw new StepError("retry");
        return step;
      },
      classify,
      concurrency: 1,
    });

    expect(attempts).toBe(2);
    expect(outcome.failed).toEqual([]);
    expect(outcome.results).toHaveLength(1);
  });

  it("重試用盡才算失敗", async () => {
    let attempts = 0;
    const outcome = await runResumableJob({
      steps: ["a"],
      runStep: async () => {
        attempts += 1;
        throw new StepError("retry");
      },
      classify,
      maxRetriesPerStep: 2,
      concurrency: 1,
    });

    expect(attempts).toBe(3);
    expect(outcome.failed).toEqual(["a"]);
  });

  /**
   * Info: (20260825 - Luphia) 混合：先有一步真失敗，之後才撞牆。
   * 失敗的留在 failed（重試會真的送出去），撞牆之後的留在 remaining。
   * 兩份清單的語意不同，畫面上也要分開說。
   */
  it("失敗與暫停併存時，兩份清單各自正確", async () => {
    const outcome = await runResumableJob({
      steps: ["ok", "bad", "wall", "later"],
      runStep: async (step) => {
        if (step === "bad") throw new StepError("fail");
        if (step === "wall") throw new StepError("pause");
        return step;
      },
      classify,
      concurrency: 1,
    });

    expect(outcome.results.map((entry) => entry.step)).toEqual(["ok"]);
    expect(outcome.failed).toEqual(["bad"]);
    expect(outcome.remaining).toEqual(["wall", "later"]);
    expect(outcome.pausedBy).toBe(JOB_PAUSE_REASON.CREDITS_EXHAUSTED);
  });
});

describe("接續", () => {
  /**
   * Info: (20260825 - Luphia) 接續＝拿上一趟的 remaining 當這一趟的 steps。
   * 做過的不重做，也就不會重扣——這是「暫停不是失敗」在金額上的意義。
   */
  it("以 remaining 接續時，已完成的步驟不會再跑一次", async () => {
    const attempted: string[] = [];
    const runStep = async (step: string) => {
      attempted.push(step);
      if (step === "b" && attempted.filter((s) => s === "b").length === 1) {
        throw new StepError("pause");
      }
      return step;
    };

    const first = await runResumableJob({
      steps: ["a", "b", "c"],
      runStep,
      classify,
      concurrency: 1,
    });
    expect(first.remaining).toEqual(["b", "c"]);

    const second = await runResumableJob({
      steps: first.remaining,
      runStep,
      classify,
      concurrency: 1,
    });

    expect(second.pausedBy).toBeNull();
    expect(second.remaining).toEqual([]);
    // Info: (20260825 - Luphia) a 只跑過一次；b 跑兩次（第一次撞牆，一點都沒扣）
    expect(attempted).toEqual(["a", "b", "b", "c"]);
  });

  it("沒有步驟時直接回空結果，不呼叫 runStep", async () => {
    let called = 0;
    const outcome = await runResumableJob({
      steps: [],
      runStep: async () => {
        called += 1;
        return null;
      },
      classify,
    });

    expect(called).toBe(0);
    expect(outcome).toEqual({
      results: [],
      failed: [],
      remaining: [],
      pausedBy: null,
    });
  });
});
