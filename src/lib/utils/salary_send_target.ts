import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";
import { hasNoEmail } from "@/lib/utils/salary_employee_filter";

/**
 * Info: (20260905 - Luphia) 「這位員工的薪資單要寄到哪」——**全站只有這一個答案**（#6775）。
 *
 * ## 修的是什麼
 *
 * 在這之前兩頁各有一套推導：
 *
 * - 薪資紀錄頁：查**即時名單** → `hasNoEmail()`，名單載入中／失敗時不下結論也不放行
 * - 計算機頁：讀 `context.employeeEmail` —— 那是 `linkEmployee()` 在**選人那一刻**
 *   抄下的副本，而 `calculator_context.tsx` 沒有任何 effect 會重新同步它
 *
 * 於是這個流程會壞掉：
 *
 * 1. 計算機頁 Step 1 選了「王小明」（信箱是空的）→ 抄下空字串
 * 2. 就在同一個彈窗裡編輯、補上信箱、存檔 → 名單 reload，但**副本沒動**
 * 3. 按「寄出薪資單」→ 灰掉，寫著「這位員工的資料裡沒有電子郵件，請先到員工列表補上」
 *
 * 而那正是他上一步剛做完的事。同一筆紀錄改到薪資紀錄頁按寄出，**寄得出去**。
 *
 * ## 為什麼是純函式而不是留在元件裡
 *
 * 本專案的測試不 render React。留在元件裡的話，「名單還在載入時要不要放行」
 * 這種判斷永遠只能靠手動點過 —— 而它有四個分支，其中兩個（載入中、名單掛掉）
 * 手動很難重現。抽出來才逐條測得到。
 *
 * 這與 `salary_employee_filter.ts` 抽出 `hasNoEmail()` 是同一條理由，
 * 只是當時只抽了述詞、沒抽整個推導 —— 於是計算機頁連那個述詞都沒用上。
 */

export interface ISalarySendTarget {
  /** Info: (20260905 - Luphia) 寄得出去時的收件信箱；擋下來時不存在 */
  email?: string;
  /**
   * Info: (20260905 - Luphia) 擋下來的原因（i18n key）；寄得出去時不存在。
   *
   * 回 key 而不是回布林：停用的按鈕一定要說得出為什麼，而「為什麼」有三種，
   * 三種的下一步不一樣（等一下／回員工列表補信箱／這個人已經不在了）。
   */
  blockedReason?: string;
}

export interface ISalaryEmployeeListState {
  employees: ISalaryCalculatorEmployee[];
  isLoading: boolean;
  hasError: boolean;
}

/**
 * Info: (20260905 - Luphia) 判斷順序是刻意的，三道各自擋不同的東西。
 *
 * 1. **名單還沒問完 / 問失敗 → 不下結論，也不放行。**
 *    那時每個人都「查不到」，而「他被刪了」與「名單掛了」是完全不同的事。
 *    這裡給的是「還在確認」，不是猜一個成因說給使用者聽。
 * 2. **名單裡沒有這個人 → 他已被移除。** 薪資紀錄還在（那是對外憑據，
 *    員工被刪不讓歷史跟著消失），但寄送對象已經不存在。
 * 3. **有這個人但沒有信箱 → 請去補。** 這一句現在說得準了：
 *    它讀的是即時名單，補完就會變。
 */
export const resolveSendTarget = (
  employeeId: string | null,
  list: ISalaryEmployeeListState,
): ISalarySendTarget => {
  /**
   * Info: (20260905 - Luphia) 還沒選人（計算機頁的情境）—— 不是錯誤，是還沒到那一步。
   * 呼叫端另有「請先儲存薪資紀錄」之類的提示在講它，這裡不搶著說。
   */
  if (employeeId === null) {
    return { blockedReason: "calculator.button.send_disabled_no_email" };
  }

  if (list.isLoading || list.hasError) {
    return { blockedReason: "calculator.button.send_disabled_loading" };
  }

  const employee = list.employees.find(
    (candidate) => candidate.id === employeeId,
  );
  if (!employee) {
    return { blockedReason: "calculator.button.send_disabled_employee_gone" };
  }

  if (hasNoEmail(employee)) {
    return { blockedReason: "calculator.button.send_disabled_no_email" };
  }

  return { email: employee.email };
};
