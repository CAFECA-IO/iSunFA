// Info: (20260803 - Tzuhan) 帳本小計與總計(單一實作)
//
// Info: (20260803 - Tzuhan) 抽出來的理由:匯入的表3.8 項目要在前端併進 ledger(Issue B),
// Info: (20260803 - Tzuhan) 而小計/總計原本只寫在 carbon_calculation.service 裡。
// Info: (20260803 - Tzuhan) 前端若自己再寫一份累加,兩份實作遲早不一致 ——
// Info: (20260803 - Tzuhan) 而不一致的表現是「明細加起來不等於小計」,那在查帳系統裡是致命的。

import { isImportedEntry } from "@/lib/carbon_table38.ledger";
import { MoneyUtil } from "@/lib/utils/money";
import type {
  IComputedLedger,
  IComputedLedgerEntry,
} from "@/types/carbon_chatbot.types";

export interface ILedgerTotals {
  scopeSubtotals: Record<string, string>;
  totalCo2eKg: string;
}

/**
 * Info: (20260803 - Tzuhan) 依 scope 累加小計與總計。全程 MoneyUtil(decimal.js),
 * 輸出字串 —— 碳排量禁止原生浮點運算,累加尤其不可以(順序會改變結果)。
 */
export function summarizeLedgerEntries(
  entries: IComputedLedgerEntry[],
): ILedgerTotals {
  const scopeSubtotals: Record<string, string> = {};
  entries.forEach((entry) => {
    const current = scopeSubtotals[entry.scopeCategory] ?? "0";
    scopeSubtotals[entry.scopeCategory] = MoneyUtil.add(current, entry.co2eKg);
  });
  const totalCo2eKg = entries.reduce(
    (acc, entry) => MoneyUtil.add(acc, entry.co2eKg),
    "0",
  );
  return { scopeSubtotals, totalCo2eKg };
}

/**
 * Info: (20260804 - Tzuhan) 把匯入項目併進帳本(單一實作)。
 *
 * 三個規則,與併入前的行為一致:
 * 1. **以 activityKey 取代同一筆**,不是附加 —— 重複匯入同一份報告是常態,
 *    附加會讓總量每匯入一次就翻一倍。
 * 2. **只換 IMPORTED 的部分**,COMPUTED 項目原樣保留 ——
 *    憑證算出來的東西不該因為匯入一份外部報告而消失。
 * 3. 小計與總計走 summarizeLedgerEntries,不另外累加。
 *
 * 抽成純函數的理由:狀態更新(setState,下一輪才生效)與當下建表(本輪就要用)
 * 需要同一份合併結果。兩邊各寫一次,就會出現「表格上的小計」與「帳本裡的小計」不一致 ——
 * 那正是這個檔案開頭那段註解在防的事。
 */
export function mergeImportedLedgerEntries(
  base: IComputedLedger | undefined,
  incoming: IComputedLedgerEntry[],
): IComputedLedger {
  const incomingKeys = new Set(incoming.map((entry) => entry.activityKey));
  const kept = (base?.entries ?? []).filter(
    (entry) => !isImportedEntry(entry) || !incomingKeys.has(entry.activityKey),
  );
  const entries = [...kept, ...incoming];
  const { scopeSubtotals, totalCo2eKg } = summarizeLedgerEntries(entries);
  return {
    ...base,
    entries,
    pending: base?.pending ?? [],
    scopeSubtotals,
    totalCo2eKg,
    computedAt: new Date().toISOString(),
  };
}
