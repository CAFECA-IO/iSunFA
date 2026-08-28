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
 * 四個規則:
 * 1. **以 activityKey 取代同一筆**,不是附加 —— 重複匯入同一份報告是常態,
 *    附加會讓總量每匯入一次就翻一倍。
 * 2. **只換 IMPORTED 的部分**,COMPUTED 項目原樣保留 ——
 *    憑證算出來的東西不該因為匯入一份外部報告而消失。
 * 3. **跨年度是換鍋,不是合併**(PR #6725 review R1):本次匯入帶年度、
 *    而帳本裡的匯入分錄屬於**別的年度**時,那些分錄整批剔除。
 *
 *    理由是實測出來的:去重鍵 `imported:{basis}:{site}:{subCategory}` 不含年度,
 *    所以規則 1 只換得掉「兩年都有」的排放源;**只有前一年有的**
 *    (關廠、廠址改名、ISO 子類別編號改版)會留下來被算進總量 ——
 *    reviewer 實測 2023(1,000,000+400,000)→ 2024(1,100,000+300,000)
 *    的帳本總量是 1,800,000,而 2024 年的真值是 1,400,000,虛增 28.6%,
 *    多出來的是一個 2024 年已經不存在的廠。而它**看起來完全正常**:
 *    孤兒列每一筆都有合法溯源(表3.8+廠址+子類別),單看帳本挑不出來。
 *
 *    「當前帳本」因此只代表**一個年度**;其他年度的分錄住在
 *    `ICarbonInventoryState.ledgerByYear` 的快照裡(那是年間比較的資料來源)。
 *    年度未知(兩邊任一沒有 year)時退回規則 1 的行為 —— 不憑猜替使用者決定年度歸屬。
 *    但**不猜不等於不說**(PR #6725 round-2 高-1):`year` 是新增的選填欄位,
 *    而帳本住在客戶端的 E2EE 草稿裡、**沒有回填路徑** ——
 *    也就是每一個既有帳本的匯入分錄都是「年度未知」,升版後再匯一年就會
 *    100% 走進孤兒列那條路,而 #6719 的引導句正把他們送過去。
 *    所以規則 3 遇到「本次年度已知、既有分錄無年度」時**留一項待補**:
 *    把一次靜默的虛增換成一個看得見的決定(待補清單是 #6707 偵測器的素材,
 *    使用者問「有沒有異常」時會被答出來)。
 * 4. 小計與總計走 summarizeLedgerEntries,不另外累加。
 *
 * 抽成純函數的理由:狀態更新(setState,下一輪才生效)與當下建表(本輪就要用)
 * 需要同一份合併結果。兩邊各寫一次,就會出現「表格上的小計」與「帳本裡的小計」不一致 ——
 * 那正是這個檔案開頭那段註解在防的事。
 */
/**
 * Info: (20260827 - Emily) 「未標註年度的匯入分錄」這一項待補的固定鍵(round-2 高-1)。
 * 固定鍵讓它可被取代而不是累積,也讓讀取端(偵測器、UI)認得出這一項的語意。
 */
export const UNDATED_IMPORTED_PENDING_KEY = "imported:undated-year";

/**
 * Info: (20260827 - Emily) 某一年度的帳本快照(PR #6725 review R1 第二項)。
 *
 * 快照要存**那份報告的分錄**,不是累積後的 computedLedger ——
 * 存累積結果會讓「2023 的快照」含有 2024 匯入的東西,
 * 年間比較於是拿自己跟自己比,而那正是這個欄位存在的理由被抵銷掉的方式。
 *
 * 小計與總計走同一支 summarizeLedgerEntries(不另外累加);
 * pending 刻意留空:待補項是「當前帳本」的狀態,不是某一年的歷史事實。
 */
export function buildYearSnapshot(
  entries: IComputedLedgerEntry[],
): IComputedLedger {
  const { scopeSubtotals, totalCo2eKg } = summarizeLedgerEntries(entries);
  return {
    entries,
    pending: [],
    scopeSubtotals,
    totalCo2eKg,
    computedAt: new Date().toISOString(),
  };
}

export function mergeImportedLedgerEntries(
  base: IComputedLedger | undefined,
  incoming: IComputedLedgerEntry[],
): IComputedLedger {
  const incomingKeys = new Set(incoming.map((entry) => entry.activityKey));
  /**
   * Info: (20260827 - Emily) 本次匯入的年度(規則 3)。
   * 取第一筆即可 —— 一次匯入來自同一份報告,年度必然一致;
   * 沒有任何一筆帶年度即「年度未知」,退回舊行為。
   */
  const incomingYear = incoming.find(
    (entry) => entry.importedOrigin?.year !== undefined,
  )?.importedOrigin?.year;
  const kept = (base?.entries ?? []).filter((entry) => {
    if (!isImportedEntry(entry)) return true;
    if (incomingKeys.has(entry.activityKey)) return false;
    /**
     * Info: (20260827 - Emily) 規則 3:兩邊年度都知道且不同 → 這筆屬於別的年度,剔除。
     * 年度未知的一邊不判斷(不猜),留給規則 1。
     */
    const entryYear = entry.importedOrigin?.year;
    if (incomingYear !== undefined && entryYear !== undefined) {
      return entryYear === incomingYear;
    }
    return true;
  });
  const entries = [...kept, ...incoming];
  const { scopeSubtotals, totalCo2eKg } = summarizeLedgerEntries(entries);
  /**
   * Info: (20260827 - Emily) 年度不明的匯入分錄要說出來(round-2 高-1)。
   * 條件刻意窄:只有在「本次匯入已知年度」時才提 —— 那時才代表使用者正在
   * 跨年度累積,而帳本裡那些沒有年度的分錄可能屬於別的年度。
   * 同一把鍵只留一項(重匯不會愈積愈多)。
   */
  const undatedImported = kept.filter(
    (entry) =>
      isImportedEntry(entry) && entry.importedOrigin?.year === undefined,
  );
  const basePending = (base?.pending ?? []).filter(
    (item) => item.activityKey !== UNDATED_IMPORTED_PENDING_KEY,
  );
  const pending =
    incomingYear !== undefined && undatedImported.length > 0
      ? [
          ...basePending,
          {
            activityKey: UNDATED_IMPORTED_PENDING_KEY,
            sourceName: `未標註盤查年度的匯入分錄(${undatedImported.length} 筆)`,
            reason: `這些分錄是在系統開始記錄盤查年度之前匯入的,無法判斷屬於哪一年;若它們屬於 ${incomingYear} 年以外的年度,帳本總量會虛增。建議清空帳本後重新匯入各年度的報告。`,
          },
        ]
      : basePending;
  return {
    ...base,
    entries,
    pending,
    scopeSubtotals,
    totalCo2eKg,
    computedAt: new Date().toISOString(),
  };
}
