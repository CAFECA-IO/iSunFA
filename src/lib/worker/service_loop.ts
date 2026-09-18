import { isShuttingDown } from "@/lib/worker/shutdown";

/**
 * Info: (20260812 - Luphia) 常駐迴圈的共用實作。
 *
 * 原本住在 `scripts/run_worker.ts` 裡。行程拆成「外部運算節點」與「內部維運節點」
 * 之後兩邊都要用它 —— 而兩份各自維護一個 `while` 迴圈，遲早會在其中一邊漏掉
 * 關機旗標或錯誤退避。
 *
 * Info: (20260811 - Luphia) 停止條件讀共用的關機旗標（見 lib/worker/shutdown）。
 *
 * 原本每個迴圈各自 `process.on("SIGINT")`，13 個迴圈就掛 13 個 listener ——
 * 超過 Node 的預設上限會噴 MaxListenersExceededWarning，而且每個迴圈只能管自己，
 * 沒有地方能在關機時統一釋放 mission 執行鎖。
 */
export async function startServiceLoop(
  nodeName: string,
  name: string,
  fn: () => Promise<unknown>,
  intervalMs = 10_000,
): Promise<void> {
  while (!isShuttingDown()) {
    try {
      await fn();
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      // Info: (20260812 - Luphia) 帶上節點名 —— 兩個行程的 log 會混在同一個收集器裡
      console.error(`[${nodeName}][${name}] Error:`, error);
      await new Promise((resolve) => setTimeout(resolve, 60_000));
    }
  }
}
