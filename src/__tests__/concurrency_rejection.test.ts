import { runWithConcurrency } from "@/lib/utils/concurrency";

/**
 * Info: (20261015 - Luphia) runWithConcurrency 在任務失敗時要把錯誤交給呼叫端，
 * 而不是留下無人處理的 rejection（那會讓 Node 直接結束整支 worker）。
 */
describe("runWithConcurrency rejection handling", () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);

  beforeEach(() => {
    unhandled.length = 0;
    process.on("unhandledRejection", onUnhandled);
  });
  afterEach(() => {
    process.off("unhandledRejection", onUnhandled);
  });

  const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

  it("rejects to the caller and leaves no unhandled rejection", async () => {
    const tasks = Array.from({ length: 6 }, (_, i) => async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (i % 2 === 0) throw new Error(`task ${i} failed`);
      return i;
    });
    await expect(runWithConcurrency(tasks, 3)).rejects.toThrow("failed");
    await flush();
    expect(unhandled).toEqual([]);
  });

  it("still returns results in order when every task succeeds", async () => {
    const tasks = [3, 1, 2].map((ms, i) => async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return i;
    });
    await expect(runWithConcurrency(tasks, 2)).resolves.toEqual([0, 1, 2]);
  });
});
