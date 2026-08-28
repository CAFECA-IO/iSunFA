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
  ILedgerYearWarning,
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
 *    所以規則 3 遇到「本次年度已知、既有分錄無年度」時**要說出來** ——
 *    但說的方式不是塞進 `pending`(round-2 追加回饋):那個桶子的語意是
 *    「活動數據待補」,借用它等於從既有的桶子偷渡第五個偵測器,而 #6707 的
 *    列舉制註解明文禁止這件事。後果三個:年度警示沒有 activityKey、
 *    輸出的 label 會變成「待補項:…」而它不是待補項、
 *    「還有 N 項活動數據待補」的計數會把它算進去。
 *    改為 detectUndatedImportedEntries 回報一個獨立訊號 ——
 *    狀態照 ledgerImportBlocks 的先例住在 state(不住 ledger),
 *    並當**第五個偵測器**進 queryAnomalies 的列舉。
 * 4. 小計與總計走 summarizeLedgerEntries,不另外累加。
 *
 * 抽成純函數的理由:狀態更新(setState,下一輪才生效)與當下建表(本輪就要用)
 * 需要同一份合併結果。兩邊各寫一次,就會出現「表格上的小計」與「帳本裡的小計」不一致 ——
 * 那正是這個檔案開頭那段註解在防的事。
 */
/**
 * Info: (20260828 - Emily) 偵測「本次匯入已知年度、但帳本裡有沒標年度的匯入分錄」。
 *
 * 條件刻意窄:只有在本次匯入帶年度時才成立 —— 那時才代表使用者正在跨年度累積,
 * 而年度未知的舊分錄可能屬於別的年度、正在虛增總量(規則 3 不猜,所以不剔除)。
 * 純函式、決定性,與 merge 同一份輸入算出來,呼叫端負責把它存進 state。
 */
export function detectUndatedImportedEntries(
  base: IComputedLedger | undefined,
  incoming: IComputedLedgerEntry[],
): ILedgerYearWarning | null {
  const incomingYear = incoming.find(
    (entry) => entry.importedOrigin?.year !== undefined,
  )?.importedOrigin?.year;
  if (incomingYear === undefined) return null;
  const incomingKeys = new Set(incoming.map((entry) => entry.activityKey));
  const undatedCount = (base?.entries ?? []).filter(
    (entry) =>
      isImportedEntry(entry) &&
      !incomingKeys.has(entry.activityKey) &&
      entry.importedOrigin?.year === undefined,
  ).length;
  return undatedCount > 0 ? { incomingYear, undatedCount } : null;
}

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
  return {
    ...base,
    entries,
    pending: base?.pending ?? [],
    scopeSubtotals,
    totalCo2eKg,
    computedAt: new Date().toISOString(),
  };
}
