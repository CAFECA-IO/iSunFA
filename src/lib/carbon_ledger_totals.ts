// Info: (20260803 - Tzuhan) 帳本小計與總計(單一實作)
//
// Info: (20260803 - Tzuhan) 抽出來的理由:匯入的表3.8 項目要在前端併進 ledger(Issue B),
// Info: (20260803 - Tzuhan) 而小計/總計原本只寫在 carbon_calculation.service 裡。
// Info: (20260803 - Tzuhan) 前端若自己再寫一份累加,兩份實作遲早不一致 ——
// Info: (20260803 - Tzuhan) 而不一致的表現是「明細加起來不等於小計」,那在查帳系統裡是致命的。

import { MoneyUtil } from "@/lib/utils/money";
import type { IComputedLedgerEntry } from "@/types/carbon_chatbot.types";

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
