import { toOrdinal } from "@/lib/utils/salary_coverage";

/**
 * Info: (20260910 - Luphia) 一筆調薪是**回溯登記**、**預先排定**，還是當期記的。
 *
 * ## 這支為什麼要存在（而不是留在 modal 裡）
 *
 * 判斷本身只有三行，但它是**時區敏感**的，而本專案的測試不 render React ——
 * 留在元件裡就只能靠手動點過，而這個錯誤手動點不出來：它只在月初與月底
 * 那幾個小時、而且只在特定時區才會發生。抽出來才進得了 `test:tz`。
 *
 * 這是 `code_review_checklist §1.11` 明文的處置：判斷抽成純函式逐條測，
 * 掃描測試降級為「元件真的呼叫了它」。
 *
 * ## 一律 UTC（20260910 產品決策：資料庫存的就是 UTC）
 *
 * `recordedAt` 是資料庫的時間戳，而 `effectiveYear` / `effectiveMonth` 是
 * 存成整數的**日曆年月**（沒有時區）。拿本地時間讀前者去跟後者比，
 * 在 UTC 以西的時區會整個月退一格：
 *
 *     recordedAt = 2026-04-01T02:00Z、effective = 2026 年 4 月
 *     UTC 讀     → 四月 vs 四月 → 當期，不標
 *     UTC-5 讀   → 三月 vs 四月 → 標成「預先排定」
 *
 * 而那個標籤是給稽核看的：「這筆是不是事後補登的」與「是不是預先排定的」
 * 對讀的人意義完全不同，翻面等於給出一個錯的結論。
 *
 * 這與 `salary_coverage.ts` 的 `ordinalOf`、`salary_employee_profile.ts` 的
 * `dayInMonth` 是同一條規則。
 */

/** Info: (20260910 - Luphia) `null` = 生效月份就是記錄月份，沒有什麼要說的 */
export type ISalaryProfileChangeTiming = "backdated" | "scheduled" | null;

export const profileChangeTiming = (change: {
  effectiveYear: number;
  effectiveMonth: number;
  /** Info: (20260910 - Luphia) epoch 秒 */
  recordedAt: number;
}): ISalaryProfileChangeTiming => {
  const recorded = new Date(change.recordedAt * 1000);

  const effectiveIndex = toOrdinal({
    year: change.effectiveYear,
    month: change.effectiveMonth,
  });
  const recordedIndex = toOrdinal({
    year: recorded.getUTCFullYear(),
    month: recorded.getUTCMonth() + 1,
  });

  if (effectiveIndex === recordedIndex) return null;

  /**
   * Info: (20260910 - Luphia) 生效在記錄**之前** = 回溯登記（事後補的）；
   * 生效在記錄**之後** = 預先排定（先講好的）。兩者對稽核的意義相反。
   */
  return effectiveIndex < recordedIndex ? "backdated" : "scheduled";
};
