import { EmploymentType } from "@/interfaces/salary_calculator";
import { DEFAULT_INDUSTRY_CODE } from "@/constants/industry_category";
import {
  ISalaryEmployeeLeave,
  ISalaryEmployeeProfile,
} from "@/interfaces/salary_record";

/**
 * Info: (20260902 - Julian) 員工檔常態屬性的分類表、到離職日推導與差異偵測。
 *
 * 這一支是「選了員工就自動匯入」整個功能的判準所在。三件事在這裡：
 *
 * 1. `EMPLOYEE_PROFILE_FIELDS` —— 哪 15 欄屬於員工（而不是這個月）
 * 2. `deriveJoinLeave` —— 完整到職日 → 計算機的「這個月第幾號」
 * 3. `diffEmployeeProfile` —— 儲存前要不要問「順便更新員工檔嗎」
 *
 * 抽成純函式而不是留在 context／JSX 裡：本專案 `testEnvironment: "node"`、
 * 沒有任何一支測試 render React，留在元件裡就只能靠掃描字串守
 * （checklist §1.11 的處方是「抽成純函式逐條測，掃描測試降級為『元件真的呼叫了它』」）。
 */

/**
 * Info: (20260902 - Julian) 屬於員工的 15 個欄位。**這張表就是那條線。**
 *
 * 型別上由 `Record<keyof ISalaryEmployeeProfile, true>` 綁住：
 * 介面加一欄而這裡沒加，會**編譯失敗**，不是靜靜漏掉。
 * 反方向（這裡多一欄）同樣編譯失敗。
 *
 * 分錯方向的代價不對稱：該存沒存只是每個月重打一次（看得見）；
 * 不該存卻存了，下個月選了員工就自動帶上個月的加班時數 ——
 * 畫面完全正常而薪水是錯的。所以 `salary_employee_profile.test.ts`
 * 另外拿 `ISalaryCalculatorFormState` 的 34 個鍵與這張表對拍，
 * 確認 16 個當月變動欄位一個都沒混進來。
 */
export const EMPLOYEE_PROFILE_FIELDS: Record<
  keyof ISalaryEmployeeProfile,
  true
> = {
  baseSalary: true,
  mealAllowance: true,
  otherAllowanceTaxable: true,
  otherAllowanceTaxFree: true,
  industryCode: true,
  isForeignWorker: true,
  employmentType: true,
  baseSalary30Days: true,
  isLaborInsured: true,
  isHealthInsured: true,
  isPensionInsured: true,
  dependentsCount: true,
  voluntaryPensionRate: true,
  hireDate: true,
  resignDate: true,
};

export const EMPLOYEE_PROFILE_KEYS = Object.keys(
  EMPLOYEE_PROFILE_FIELDS,
) as (keyof ISalaryEmployeeProfile)[];

// Info: (20260902 - Julian) 落地存的是 EmploymentType 的鍵，不是顯示字串。值域只有這兩個
export const EMPLOYMENT_TYPE_KEYS = Object.keys(EmploymentType);

/**
 * Info: (20260902 - Julian) 僱用型態的 i18n 路徑，**只在這裡組一次**。
 *
 * `i18n_keys.test.ts` 的掃描器認的是字面，所以每個自己組這個樣板的檔案
 * 都要在 `DYNAMIC_KEY_EXPANSIONS` 登記一次 —— 而變數名不同（`type` / `key` / `value`）
 * 就算不同的樣板。三個呼叫端就是三筆登記，少登記一筆那一組鍵就沒人守。
 * 收斂成一支函式之後，字面只有這一個，登記也只有一筆。
 */
export const employmentTypeI18nKey = (key: string): string =>
  `calculator.basic_info_form.${key.toLowerCase()}`;

export interface IJoinLeaveState {
  isJoined: boolean;
  dayOfJoining: string;
  isLeft: boolean;
  dayOfLeaving: string;
}

/**
 * Info: (20260902 - Julian) 一個 Unix 秒的日期落不落在指定的年月裡；落在的話是第幾號。
 *
 * **一律 `getUTC*`。** 寫入端組的是 `new Date("2026-08-15")`，那個字串被當成
 * UTC 午夜解析；用 `getDate()` 在 UTC 以西的時區會退一天 —— 而那個錯
 * **在 UTC 與 UTC+8 都測不出來**（兩者取出的日期相同，判準完全分不出成功與失敗）。
 * 判準因此放在 `salary_employee_profile.tz.test.ts`，由 `scripts/jest_tz.mjs`
 * 釘在 `America/New_York` 再跑一次。
 */
const dayInMonth = (
  timestamp: number | null,
  year: number,
  month: number,
): string | null => {
  if (timestamp === null) return null;

  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return null;

  if (date.getUTCFullYear() !== year) return null;
  if (date.getUTCMonth() + 1 !== month) return null;

  return date.getUTCDate().toString().padStart(2, "0");
};

/**
 * Info: (20260902 - Julian) 員工檔上的到職／離職日 → 計算機的四個欄位。
 *
 * ## 為什麼是推導而不是直接存
 *
 * 引擎只關心「**這一個月**裡有沒有中途到職，第幾號」（`toCalculatorOptions` 是拿
 * 選定的年月加上一個 1–31 組時間戳）。而員工檔上該存的是真實日期 ——
 * 兩者之間差一次推導。
 *
 * 這一併修掉一個既有問題：今天 `isJoined` / `dayOfJoining` 是純 UI 狀態、沒有來源，
 * 使用者換一個月份它們原封不動 —— 八月中途到職的人，切到九月照樣被算成
 * 九月中途到職，而九月的薪水會少算半個月。有了真實日期，切月份時答案自己會對。
 *
 * 沒有到職日、或到職日不在這個月時回 `isJoined: false` 與 `"01"` ——
 * `"01"` 是計算機那兩個欄位的預設值，回 `undefined` 會讓下拉變成非受控元件。
 */
export const deriveJoinLeave = (
  profile: Pick<ISalaryEmployeeProfile, "hireDate" | "resignDate">,
  period: { year: number; month: number },
): IJoinLeaveState => {
  const joinDay = dayInMonth(profile.hireDate, period.year, period.month);
  const leaveDay = dayInMonth(profile.resignDate, period.year, period.month);

  return {
    isJoined: joinDay !== null,
    dayOfJoining: joinDay ?? "01",
    isLeft: leaveDay !== null,
    dayOfLeaving: leaveDay ?? "01",
  };
};

/**
 * Info: (20260902 - Julian) 反方向：計算機的四個欄位 → 員工檔上的完整日期。
 *
 * 給「直接新增員工」與「回寫員工檔」用 —— 那兩條路上使用者剛在計算機
 * 勾好「這個月 15 號到職」，而員工檔要存的是 `2026-08-15`。
 * 年月取自當下選定的期間，那是這個資訊唯一的來源。
 *
 * `Date.UTC` 而不是 `new Date(y, m, d)`：後者用本地時區建構，
 * 存進去之後用 `getUTCDate()` 讀回來會差一天（`deriveJoinLeave` 的反面）。
 *
 * 日超過該月天數時夾到最後一天：計算機的日期下拉是固定的 1–31，
 * 使用者在二月選得到 31 號。`Date.UTC(2026, 1, 31)` 會滾到 3/3，
 * 於是「二月底離職」變成「三月初離職」—— 一個完全合法、只是錯的日期。
 */
export const composeJoinLeaveDates = (
  state: IJoinLeaveState,
  period: { year: number; month: number },
): Pick<ISalaryEmployeeProfile, "hireDate" | "resignDate"> => {
  const lastDay = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();

  const compose = (enabled: boolean, day: string): number | null => {
    if (!enabled) return null;

    const parsed = Number.parseInt(day, 10);
    if (!Number.isFinite(parsed)) return null;

    const clamped = Math.min(Math.max(parsed, 1), lastDay);
    return Date.UTC(period.year, period.month - 1, clamped) / 1000;
  };

  return {
    hireDate: compose(state.isJoined, state.dayOfJoining),
    resignDate: compose(state.isLeft, state.dayOfLeaving),
  };
};

export interface IProfileDiffEntry {
  field: keyof ISalaryEmployeeProfile;
  before: ISalaryEmployeeProfile[keyof ISalaryEmployeeProfile];
  after: ISalaryEmployeeProfile[keyof ISalaryEmployeeProfile];
}

/**
 * Info: (20260902 - Julian) 數值比較前先取整。
 *
 * 金額在表單裡是 `number`、在資料庫是 `BigInt`，來回一趟可能差一個
 * 0.0000001；不取整的話「儲存薪資紀錄」每一次都會跳出「要不要更新員工檔」，
 * 而且列出來的差異看起來一模一樣 —— 那比不問還糟，使用者會學會直接關掉它。
 *
 * 費率已經是整數百分點（見 `salary_pension_rate.ts`），時間戳是整數秒，
 * 所以取整對這 15 欄都是安全的。
 */
const sameValue = (a: unknown, b: unknown): boolean => {
  if (typeof a === "number" && typeof b === "number") {
    return Math.round(a) === Math.round(b);
  }
  return a === b;
};

/**
 * Info: (20260902 - Julian) 計算機當下的值與員工檔的差異，逐欄列出。
 *
 * 給「儲存時問一句」用（產品決策 D2：單向為主，儲存時偵測差異）。
 * 回傳逐欄的 before/after 而不是一個布林 —— 對話框要寫得出
 * 「扶養人數 0 → 1」，而不是「要不要更新員工資料」。
 * 後者使用者無從判斷，於是每次都按同一個鍵，那道確認就等於不存在。
 *
 * 順序照 `EMPLOYEE_PROFILE_KEYS`，不是 `Object.keys(current)` ——
 * 後者的順序取決於物件怎麼被建出來，對話框上的排列會隨呼叫端而變。
 */
export const diffEmployeeProfile = (
  current: ISalaryEmployeeProfile,
  stored: ISalaryEmployeeProfile,
): IProfileDiffEntry[] =>
  EMPLOYEE_PROFILE_KEYS.flatMap((field) =>
    sameValue(current[field], stored[field])
      ? []
      : [{ field, before: stored[field], after: current[field] }],
  );

/**
 * Info: (20260902 - Julian) 新增員工時的預設常態屬性。
 *
 * 值與 `prisma/schema.prisma` 上那 13 個 `@default` 一致，也與計算機的初始狀態一致
 * —— 三邊同步由 `salary_employee_profile.test.ts` 與 `salary_schema_defaults.test.ts` 守著。
 *
 * 用在「從員工列表新增一位還沒設定過的人」。**「直接新增並儲存」那條路不用它** ——
 * 那裡使用者剛在計算機把欄位都填好了，要帶的是當下的值（計畫書 §4.3）。
 */
export const DEFAULT_EMPLOYEE_PROFILE: ISalaryEmployeeProfile = {
  baseSalary: 0,
  mealAllowance: 0,
  otherAllowanceTaxable: 0,
  otherAllowanceTaxFree: 0,
  industryCode: DEFAULT_INDUSTRY_CODE,
  isForeignWorker: false,
  /**
   * Info: (20260902 - Julian) 存的是 enum 的**鍵**，所以這裡是 "FULL_TIME" 而不是
   * `EmploymentType.FULL_TIME`（那是顯示字串 "Full-time"）。
   * 是不是合法的鍵由 `salary_employee_profile.test.ts` 對 `EMPLOYMENT_TYPE_KEYS` 守著。
   */
  employmentType: "FULL_TIME",
  baseSalary30Days: true,
  isLaborInsured: true,
  isHealthInsured: true,
  isPensionInsured: true,
  dependentsCount: 0,
  voluntaryPensionRate: 0,
  hireDate: null,
  resignDate: null,
};

/**
 * Info: (20260905 - Luphia) 新增員工時的留職停薪初值：沒有（#6774）。
 *
 * 與 `DEFAULT_EMPLOYEE_PROFILE` 分開一個常數，不是併進去 —— 併進去
 * `ISalaryEmployeeProfile` 就得多兩欄，而那個型別是「自動匯入計算機」的契約
 *（見 `EMPLOYEE_PROFILE_FIELDS` 上方）。
 *
 * 兩欄都是 null 而不是 0：0 在 Unix 秒是 1970-01-01，那會被當成
 * 「1970 年開始留停、至今未復職」，於是這個人每一個月都不算缺漏。
 */
export const DEFAULT_EMPLOYEE_LEAVE: ISalaryEmployeeLeave = {
  leaveStartDate: null,
  leaveEndDate: null,
};

/**
 * Info: (20260902 - Julian) Unix 秒 ↔ `<input type="date">` 的 `YYYY-MM-DD`。
 *
 * `input[type=date]` 收發的是一個沒有時區的日曆日字串，而我們存的是 UTC 午夜的時間戳
 * —— 兩者之間只差一次格式化，但**必須走 UTC**：
 *
 * - `new Date(ts).toISOString().slice(0, 10)` 在 UTC-5 會把 2026-08-15T00:00:00Z
 *   顯示成 2026-08-15（對），而 `toLocaleDateString()` 會顯示 2026-08-14（錯）
 * - 反方向 `new Date("2026-08-15")` 本來就被當成 UTC 午夜解析，所以 `Date.parse` 是對的；
 *   `new Date(2026, 7, 15)` 則是本地午夜，存進去會偏移
 *
 * 判準在 `salary_employee_profile.tz.test.ts`（釘 `America/New_York`）——
 * 這一對在 UTC 與 UTC+8 都看不出差別。
 */
export const toDateInputValue = (timestamp: number | null): string => {
  if (timestamp === null) return "";

  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

// Info: (20260902 - Julian) 空字串代表「清掉這個日期」，回 null 而不是 0（1970 年是一個合法但錯的日期）
export const fromDateInputValue = (value: string): number | null => {
  if (value === "") return null;

  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return null;

  return parsed / 1000;
};

/**
 * Info: (20260902 - Julian) 每個常態欄位的顯示名稱（i18n 路徑）。
 *
 * 給「儲存前的差異對話框」用 —— 它要寫得出「扶養人數 0 → 1」，
 * 而不是「要不要更新員工資料」。後者使用者無從判斷，於是每次都按同一個鍵，
 * 那道確認就等於不存在。
 *
 * 值一律是**字面字串**而不是組出來的路徑：`i18n_keys.test.ts` 掃的是字面，
 * 組出來的鍵它看不到，而看不到就等於沒有守。
 *
 * 型別是 `Record<keyof ISalaryEmployeeProfile, string>` —— 介面加一欄
 * 而這裡沒加會編譯失敗，對話框不會出現一個沒有名字的欄位。
 */
export const PROFILE_FIELD_I18N_KEY: Record<
  keyof ISalaryEmployeeProfile,
  string
> = {
  baseSalary: "calculator.base_pay_form.base_salary",
  mealAllowance: "calculator.base_pay_form.meal_allowance",
  otherAllowanceTaxable: "calculator.employee_list.other_allowance_taxable",
  otherAllowanceTaxFree: "calculator.employee_list.other_allowance_tax_free",
  industryCode: "calculator.basic_info_form.industry_category",
  isForeignWorker: "calculator.basic_info_form.tax_residency_status",
  employmentType: "calculator.employee_list.employment_type",
  baseSalary30Days: "calculator.basic_info_form.payroll_days_base",
  isLaborInsured: "calculator.others_form.option_labor_insurance",
  isHealthInsured: "calculator.others_form.option_nhi",
  isPensionInsured: "calculator.others_form.option_labor_pension",
  dependentsCount: "calculator.others_form.number_of_dependents",
  voluntaryPensionRate: "calculator.employee_list.voluntary_pension_rate",
  hireDate: "calculator.employee_list.hire_date",
  resignDate: "calculator.employee_list.resign_date",
};
