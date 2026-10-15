import { LeaveYearScheme } from "@/generated";

/**
 * Info: (20260914 - Julian) 特休年度制度的顯示順序與文案鍵。
 *
 * 放在 `constants/` 而不是留在 `company_setting_page_body.tsx`：
 * `i18n_keys.test.ts` 的 `DYNAMIC_KEY_EXPANSIONS` 要用這兩個值域去展開
 * 樣板鍵，而測試不該為了一組常數去 import 一個 client component
 * （那會把 React 與 lucide 一起拖進 `testEnvironment: "node"` 的測試裡）。
 *
 * 這也是 `SALARY_ACCESS_ROLES` 放在 `constants/` 的同一個理由。
 */
export const LEAVE_YEAR_SCHEMES = [
  LeaveYearScheme.ANNIVERSARY,
  LeaveYearScheme.CALENDAR,
  LeaveYearScheme.CUSTOM,
] as const;

/**
 * Info: (20260914 - Julian) enum → 文案鍵。**畫面與測試同一份來源。**
 *
 * 各寫一份的話，日後增刪一種制度只會改到一邊 ——
 * 而畫面少一個選項與字典多一個死鍵，兩邊都「看起來正常」
 * （同 `PAY_SLIP_INSURED_FIELDS` 的理由）。
 */
export const SCHEME_LABEL_KEY: Record<LeaveYearScheme, string> = {
  [LeaveYearScheme.ANNIVERSARY]: "scheme_anniversary",
  [LeaveYearScheme.CALENDAR]: "scheme_calendar",
  [LeaveYearScheme.CUSTOM]: "scheme_custom",
};
