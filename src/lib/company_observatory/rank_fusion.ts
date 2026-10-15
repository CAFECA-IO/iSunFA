import { OBSERVATORY_RRF_K } from "@/constants/company_observatory";

/**
 * Info: (20261015 - Luphia) 倒數排名融合（Reciprocal Rank Fusion）。純函數。
 *
 * 把幾份各自排好序的候選清單（向量檢索、全文檢索、手動匯入表的向量檢索…）合成一份：
 * 每份清單第 r 名（從 1 起算）貢獻 1 / (k + r)，同一筆出現在多份清單就累加。
 * 只看名次、不看分數，所以 L2 距離與 BM25 分數這種尺度不同的結果也能合併；
 * 兩種檢索都排得前面的切塊會勝過只在其中一種排第一的切塊。
 *
 * 同分時依「最早出現的清單、最前面的名次」排序，結果是決定性的。
 */
export function reciprocalRankFusion<T>(
  lists: readonly (readonly T[])[],
  keyOf: (item: T) => string,
  k: number = OBSERVATORY_RRF_K,
): T[] {
  const fused = new Map<string, { item: T; score: number; order: number }>();
  let order = 0;
  for (const list of lists) {
    const seenInList = new Set<string>();
    list.forEach((item, index) => {
      const key = keyOf(item);
      // Info: (20261015 - Luphia) 同一份清單裡重複的鍵只算第一次，避免重複列灌分
      if (seenInList.has(key)) return;
      seenInList.add(key);
      const contribution = 1 / (k + index + 1);
      const entry = fused.get(key);
      if (entry) {
        entry.score += contribution;
      } else {
        fused.set(key, { item, score: contribution, order });
        order += 1;
      }
    });
  }
  return Array.from(fused.values())
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((entry) => entry.item);
}
