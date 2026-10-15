/**
 * Info: (20261015 - Luphia) 逐主機的最短請求間隔。
 *
 * 同一主機的請求依序排隊，每一個都至少等到「上一個開始後 + 間隔」才出發；不同主機互不影響。
 * 只在單一行程內有效——這正是我們要的：worker 租約保證同一個資料庫只有一個 worker 在下載。
 * 時鐘與睡眠可注入，測試不必真的等。
 */
export interface IHostRateLimiterOptions {
  intervals: Record<string, number>;
  defaultIntervalMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface IHostRateLimiter {
  wait(host: string): Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createHostRateLimiter(
  options: IHostRateLimiterOptions,
): IHostRateLimiter {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  // Info: (20261015 - Luphia) 每台主機「下一個請求最早可以出發的時間」
  const nextSlot = new Map<string, number>();

  return {
    async wait(host: string): Promise<void> {
      const interval = options.intervals[host] ?? options.defaultIntervalMs;
      const current = now();
      const slot = Math.max(current, nextSlot.get(host) ?? 0);
      // Info: (20261015 - Luphia) 先佔位再睡，同時進來的請求才會排在後面而不是一起出發
      nextSlot.set(host, slot + interval);
      if (slot > current) await sleep(slot - current);
    },
  };
}
