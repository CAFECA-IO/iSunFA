import { LeaveYearScheme } from "@/generated";
import { IAccountBookCompanyProfile } from "@/interfaces/salary_company_profile";

/**
 * Info: (20260914 - Julian) 公司設定表單的欄位值，與送出去的那一份之間的轉換。
 *
 * ## 為什麼「送出」與「有沒有改過」要共用同一支轉換
 *
 * 表單裡放的是字串（`<input>` 交出來的就是字串），送出去的是
 * `IAccountBookCompanyProfile`：空字串要變 `null`、月／日要變數字、
 * 非約定年度時月／日一律清成 `null`。
 *
 * 「有沒有未儲存的變更」必須用**同一套規則**正規化之後再比 ——
 * 各寫一份的話，兩邊會慢慢走鐘，而走鐘的症狀分兩種，都很難查：
 *
 * - 比較比送出寬鬆 → 明明改過卻說沒改 → **離開時不問，改的東西直接消失**
 * - 比較比送出嚴格 → 什麼都沒動也說改過 → 每次離開都問一次，很快就被無視
 *
 * 所以 `isCompanyProfileDirty` 是拿 `companyProfileFormToPayload` 的結果去比的，
 * 不是自己再讀一次那幾個欄位。
 */
export interface ICompanyProfileForm {
  entityName: string;
  taxId: string;
  responsiblePerson: string;
  address: string;
  scheme: LeaveYearScheme | null;
  startMonth: string;
  startDay: string;
}

// Info: (20260914 - Julian) 只有空白的輸入等於沒填，不要存成一個看不見的空字串
const trimmedOrNull = (value: string): string | null =>
  value.trim() === "" ? null : value.trim();

/**
 * Info: (20260915 - Julian) 沒填的數字欄是 `null`，**不是 `0`**（review L2）。
 *
 * 原本寫 `Number(form.startMonth)`，而 `Number("") === 0`。
 * 於是「選了約定年度但月／日留空」送出去的是 `0`／`0`，
 * 被 `min(1)` 擋下 —— 擋是擋住了，但 `superRefine` 那句
 * 「custom leave year scheme requires a start month and day」**永遠到不了**，
 * 使用者看到的是「數字太小」而不是「這兩格要填」。
 *
 * 更重要的是前後端對「沒填」要是同一個值：這一頁其他每一個可空欄位
 * 都收斂成 `null`（`trimmedOrNull`、validator 的 `optionalText`），
 * 只有這兩格是 `0` —— 而 `0` 是一個合法的數字，不是一個空值。
 */
const numberOrNull = (value: string): number | null =>
  value.trim() === "" ? null : Number(value);

export const companyProfileFormToPayload = (
  form: ICompanyProfileForm,
): IAccountBookCompanyProfile => {
  const isCustom = form.scheme === LeaveYearScheme.CUSTOM;

  return {
    entityName: form.entityName.trim(),
    taxId: trimmedOrNull(form.taxId),
    responsiblePerson: trimmedOrNull(form.responsiblePerson),
    address: trimmedOrNull(form.address),
    leaveYearScheme: form.scheme,
    /**
     * Info: (20260914 - Julian) 非約定年度時月／日一律清成 `null`。
     *
     * 使用者可能先選了約定年度、填了 3/1，再改回曆年制 —— 那兩個數字
     * 留著的話會存進一份自相矛盾的設定（後端的 `superRefine` 也會擋，
     * 但那時使用者看到的是「儲存失敗」而不是「那兩格不算數了」）。
     */
    leaveYearStartMonth: numberOrNull(isCustom ? form.startMonth : ""),
    leaveYearStartDay: numberOrNull(isCustom ? form.startDay : ""),
  };
};

/**
 * Info: (20260914 - Julian) 表單現在的值，與最後一次載入／儲存的那一份不同嗎。
 *
 * 逐欄比而不是 `JSON.stringify` 兩邊：後者對鍵的順序敏感，
 * 而兩邊的物件是不同地方組出來的 —— 順序一致是巧合，不是保證。
 */
export const isCompanyProfileDirty = (
  form: ICompanyProfileForm,
  saved: IAccountBookCompanyProfile,
): boolean => {
  const next = companyProfileFormToPayload(form);

  return (
    next.entityName !== saved.entityName ||
    next.taxId !== saved.taxId ||
    next.responsiblePerson !== saved.responsiblePerson ||
    next.address !== saved.address ||
    next.leaveYearScheme !== saved.leaveYearScheme ||
    next.leaveYearStartMonth !== saved.leaveYearStartMonth ||
    next.leaveYearStartDay !== saved.leaveYearStartDay
  );
};
