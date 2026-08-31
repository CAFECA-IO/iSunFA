import { MONTHS, MonthType } from "@/constants/month";
import { INDUSTRY_CATEGORY_OPTIONS } from "@/constants/industry_category";
import { PayrollDaysBase } from "@/constants/salary_calculator";
import {
  ISalaryCalculatorFormState,
  ISalaryCalculatorOptions,
  TaxResidencyStatus,
} from "@/interfaces/salary_calculator";

/**
 * Info: (20260831 - Julian) 計算機表單狀態 ↔ 引擎輸入契約的雙向轉換。
 *
 * ## 為什麼是一對純函式，而不是留在 context 裡
 *
 * `toCalculatorOptions` 原本是 `calculator_context` 的 `getSalaryCalculatorOptions()`。
 * 現在多了一個反方向的需求（把存下來的薪資紀錄載回計算機），而兩個方向**必須成對維護**：
 * 引擎加一個欄位、只改了其中一邊，症狀是「載回來的紀錄少一項」，而且是靜默的。
 *
 * 抽成純函式之後 `salary_snapshot_roundtrip.test.ts` 才驗得到 ——
 * 本專案的測試不 render React，留在 context 裡就等於沒有守門人。
 */

// Info: (20260831 - Julian) 沒有對應到任何行業別時的退路，與 context 的預設一致
const DEFAULT_INDUSTRY_CODE = 42;

const toDayString = (timestampInSeconds: number): string =>
  new Date(timestampInSeconds * 1000).getUTCDate().toString().padStart(2, "0");

/**
 * Info: (20260831 - Julian) 日期用 UTC 讀寫，不是為了時區正確，是為了**可逆**。
 *
 * 寫入端組的是 `new Date("2026-08-01")` —— 那個字串會被當成 UTC 午夜解析。
 * 讀回來若用 `getDate()`，在 UTC 以西的時區會退一天（本專案有一整組
 * `*.tz.test.ts` 在守這類缺陷）。`getUTCDate()` 才是它的反函式。
 */
const toTimestamp = (year: number, month: number, day: string): number =>
  new Date(`${year}-${month.toString().padStart(2, "0")}-${day}`).getTime() /
  1000;

export function toCalculatorOptions(
  form: ISalaryCalculatorFormState,
): ISalaryCalculatorOptions {
  const year = parseInt(form.selectedYear, 10);
  // Info: (20250728 - Julian) index 從 0 開始，所以要加 1
  const month =
    MONTHS.findIndex((item) => item.name === form.selectedMonth.name) + 1;

  return {
    year,
    month,
    job: form.industryCategory.CODE,
    foreignWorker: form.taxResidencyStatus === TaxResidencyStatus.NON_TAIWAN,
    employeeStartDate: form.isJoined
      ? toTimestamp(year, month, form.dayOfJoining)
      : undefined,
    employeeEndDate: form.isLeft
      ? toTimestamp(year, month, form.dayOfLeaving)
      : undefined,
    baseSalaryTaxable: form.baseSalary,
    baseSalaryTaxFree: form.mealAllowance,
    otherAllowancesTaxable: form.otherAllowanceWithTax,
    otherAllowancesTaxFree: form.otherAllowanceWithoutTax,
    overTimeHoursTaxable133: form.oneAndOneThirdHoursForTaxable,
    overTimeHoursTaxable166: form.oneAndTwoThirdsHoursForTaxable,
    overTimeHoursTaxable200: form.twoHoursForTaxable,
    overTimeHoursTaxable233: form.twoAndOneThirdsHoursForTaxable,
    overTimeHoursTaxable266: form.twoAndTwoThirdsHoursForTaxable,
    overTimeHoursTaxFree133: form.oneAndOneThirdsHoursForNonTax,
    overTimeHoursTaxFree166: form.oneAndTwoThirdsHoursForNonTax,
    overTimeHoursTaxFree200: form.twoHoursForNonTax,
    overTimeHoursTaxFree233: form.twoAndOneThirdsHoursForNonTax,
    overTimeHoursTaxFree266: form.twoAndTwoThirdsHoursForNonTax,
    vacationToPayHours: form.leavePayoutHours,
    sickLeaveHours: form.sickLeaveHours,
    personalLeaveHours: form.personalLeaveHours,
    isLaborInsuranceEnrolled: form.isLaborInsurance,
    isHealthInsuranceEnrolled: form.isNHI,
    isPensionInsuranceEnrolled: form.isLaborPension,
    employeeBurdenHealthInsurancePremiums: form.nhiBackPremium,
    employeeBurdenSecondGenerationHealthInsurancePremiums: form.secondGenNhiTax,
    employeeBurdenOtherOverflowDeductions: form.otherAdjustments,
    employeeBurdenPensionInsurance: form.voluntaryPensionContribution,
    dependentsCount: form.numberOfDependents,
    baseSalary30Days: form.payrollDaysBase === PayrollDaysBase.FIXED,
  };
}

/**
 * Info: (20260831 - Julian) 反方向：把存下來的引擎輸入還原成表單狀態。
 *
 * 可選欄位一律以 0 / false 補上 —— 表單沒有「未填」這個狀態，
 * 而 `undefined` 灌進 `useState<number>` 會讓輸入框變成非受控元件。
 *
 * `overTimeHoursTaxable100` / `overTimeHoursTaxFree100` 刻意不還原：
 * 計算機的 UI 沒有 100% 加班的欄位（`toCalculatorOptions` 也不產生它們），
 * 硬塞回來會憑空生出一個看不到、卻會參與計算的值。
 */
export function fromCalculatorOptions(
  input: ISalaryCalculatorOptions,
  fallbackMonth: MonthType,
): ISalaryCalculatorFormState {
  const industryCategory =
    INDUSTRY_CATEGORY_OPTIONS.find((item) => item.CODE === input.job) ??
    INDUSTRY_CATEGORY_OPTIONS.find(
      (item) => item.CODE === DEFAULT_INDUSTRY_CODE,
    ) ??
    INDUSTRY_CATEGORY_OPTIONS[0];

  return {
    selectedYear: input.year.toString(),
    selectedMonth: MONTHS[input.month - 1] ?? fallbackMonth,
    industryCategory,
    taxResidencyStatus: input.foreignWorker
      ? TaxResidencyStatus.NON_TAIWAN
      : TaxResidencyStatus.TAIWAN,
    isJoined: input.employeeStartDate !== undefined,
    dayOfJoining:
      input.employeeStartDate !== undefined
        ? toDayString(input.employeeStartDate)
        : "01",
    isLeft: input.employeeEndDate !== undefined,
    dayOfLeaving:
      input.employeeEndDate !== undefined
        ? toDayString(input.employeeEndDate)
        : "01",
    payrollDaysBase: input.baseSalary30Days
      ? PayrollDaysBase.FIXED
      : PayrollDaysBase.ACTUAL,

    baseSalary: input.baseSalaryTaxable,
    mealAllowance: input.baseSalaryTaxFree,
    otherAllowanceWithTax: input.otherAllowancesTaxable ?? 0,
    otherAllowanceWithoutTax: input.otherAllowancesTaxFree ?? 0,

    oneAndOneThirdHoursForTaxable: input.overTimeHoursTaxable133 ?? 0,
    oneAndTwoThirdsHoursForTaxable: input.overTimeHoursTaxable166 ?? 0,
    twoHoursForTaxable: input.overTimeHoursTaxable200 ?? 0,
    twoAndOneThirdsHoursForTaxable: input.overTimeHoursTaxable233 ?? 0,
    twoAndTwoThirdsHoursForTaxable: input.overTimeHoursTaxable266 ?? 0,
    oneAndOneThirdsHoursForNonTax: input.overTimeHoursTaxFree133 ?? 0,
    oneAndTwoThirdsHoursForNonTax: input.overTimeHoursTaxFree166 ?? 0,
    twoHoursForNonTax: input.overTimeHoursTaxFree200 ?? 0,
    twoAndOneThirdsHoursForNonTax: input.overTimeHoursTaxFree233 ?? 0,
    twoAndTwoThirdsHoursForNonTax: input.overTimeHoursTaxFree266 ?? 0,
    leavePayoutHours: input.vacationToPayHours ?? 0,
    sickLeaveHours: input.sickLeaveHours ?? 0,
    personalLeaveHours: input.personalLeaveHours ?? 0,

    isLaborInsurance: input.isLaborInsuranceEnrolled ?? true,
    isNHI: input.isHealthInsuranceEnrolled ?? true,
    isLaborPension: input.isPensionInsuranceEnrolled ?? true,
    nhiBackPremium: input.employeeBurdenHealthInsurancePremiums ?? 0,
    secondGenNhiTax:
      input.employeeBurdenSecondGenerationHealthInsurancePremiums ?? 0,
    otherAdjustments: input.employeeBurdenOtherOverflowDeductions ?? 0,
    voluntaryPensionContribution: input.employeeBurdenPensionInsurance ?? 0,
    numberOfDependents: input.dependentsCount ?? 0,
  };
}
