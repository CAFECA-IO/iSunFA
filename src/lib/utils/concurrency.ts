/**
 * Info: (20260407 - Tzuhan) 輕量級併發控制器 (Concurrency Limiter)
 * @param tasks 待執行的 Promise 任務工廠陣列 (必須是 () => Promise<T> 的形式)
 * @param concurrencyLimit 最大同時執行數量 (預設 5)
 * @returns 所有任務的執行結果陣列
 */
export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrencyLimit: number = 5,
): Promise<T[]> {
  const results: T[] = [];
  // Info: (20260407 - Tzuhan) 追蹤目前正在執行中的 Promise 池
  const executing = new Set<Promise<void>>();

  let index = 0;
  for (const task of tasks) {
    const currentIndex = index++;

    // Info: (20260407 - Tzuhan) 啟動任務，並將結果塞回對應的 index
    const p = Promise.resolve()
      .then(() => task())
      .then((result) => {
        results[currentIndex] = result;
      });

    // Info: (20260407 - Tzuhan) 將任務加入執行池
    executing.add(p);

    // Info: (20260407 - Tzuhan) 當任務完成時，將自己從執行池中移除
    p.then(() => {
      executing.delete(p);
    });

    // Info: (20260407 - Tzuhan) 如果執行池已經滿了，就等待池中「最快完成的那一個」結束，再繼續塞下一個任務
    if (executing.size >= concurrencyLimit) {
      await Promise.race(executing);
    }
  }

  // Info: (20260407 - Tzuhan) 等待最後一批任務全部執行完畢
  await Promise.all(executing);
  return results;
}
