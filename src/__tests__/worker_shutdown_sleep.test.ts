import { describe, it, expect } from "@jest/globals";
import {
  isShuttingDown,
  requestWorkerShutdown,
  sleepUnlessShuttingDown,
} from "@/lib/worker/shutdown";

/**
 * Info: (20261015 - Luphia) 迴圈之間的等待在關機時要提前醒來。
 * 匯率同步一輪睡 8 小時；不提前醒，收到關機訊號或失去 worker 租約後要等它睡醒才結束。
 */
describe("sleepUnlessShuttingDown", () => {
  it("要求關機時正在睡的迴圈立即醒來，之後的等待直接返回", async () => {
    const started = Date.now();
    const sleeping = sleepUnlessShuttingDown(8 * 60 * 60 * 1000);
    requestWorkerShutdown();
    await sleeping;
    await sleepUnlessShuttingDown(8 * 60 * 60 * 1000);
    expect(isShuttingDown()).toBe(true);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
