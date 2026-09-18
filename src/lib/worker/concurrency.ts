/**
 * Info: (20260915 - Luphia) 應用層並行（PR #6650 review 四輪建議-6）。
 *
 * 零依賴、零 prisma：住在 `lib/worker` 讓兩種節點都能用。結果順序與輸入順序相同，
 * 單筆失敗不影響其他筆——呼叫端拿到 `PromiseSettledResult[]` 自己決定失敗怎麼算
 *（recorder 把「讀不到」視為「尚無判決」，不能讓一筆 RPC 錯誤把整輪拖垮）。
 * `limit` ≤ 0 視為 1：並行上限是保護 provider 的閥，不是可以關掉的東西。
 */
export const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> => {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  const width = Math.max(1, Math.floor(limit));
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      try {
        results[index] = {
          status: "fulfilled",
          value: await fn(items[index], index),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(width, items.length) }, () => worker()),
  );
  return results;
};
