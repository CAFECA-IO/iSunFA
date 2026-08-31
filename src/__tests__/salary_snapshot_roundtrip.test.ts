import { describe, it, expect } from "@jest/globals";
import { MONTHS } from "@/constants/month";
import { INDUSTRY_CATEGORY_OPTIONS } from "@/constants/industry_category";
import { PayrollDaysBase } from "@/constants/salary_calculator";
import {
  ISalaryCalculatorFormState,
  ISalaryCalculatorOptions,
  TaxResidencyStatus,
} from "@/interfaces/salary_calculator";
import {
  fromCalculatorOptions,
  toCalculatorOptions,
} from "@/lib/utils/salary_calculator_snapshot";

/**
 * Info: (20260831 - Julian) 表單狀態 ↔ 引擎輸入的來回轉換。
 *
 * ## 為什麼這一支非有不可
 *
 * 「儲存薪資紀錄」存的是 `toCalculatorOptions` 的輸出；「載回計算機」用的是
 * `fromCalculatorOptions`。兩個方向**必須成對維護** —— 引擎加一個欄位而只改了
 * 其中一邊，症狀是「載回來的紀錄少了一項」，而且完全靜默：畫面照樣渲染、
 * 數字照樣算得出來，只是算的是另一筆薪水。
 *
 * 這也是把那段對應從 `calculator_context` 抽成純函式的唯一理由 ——
 * 留在 context 裡的話，只有 render React 才驗得到，而本專案不 render React。
 */

const FORM: ISalaryCalculatorFormState = {
  selectedYear: "2026",
  // Info: (20260831 - Julian) 8 月，index 從 0 開始
  selectedMonth: MONTHS[7],
  industryCategory: INDUSTRY_CATEGORY_OPTIONS.find((item) => item.CODE === 42)!,
  taxResidencyStatus: TaxResidencyStatus.TAIWAN,
  isJoined: true,
  dayOfJoining: "15",
  isLeft: false,
  dayOfLeaving: "01",
  payrollDaysBase: PayrollDaysBase.FIXED,

  baseSalary: 36000,
  mealAllowance: 3000,
  otherAllowanceWithTax: 1200,
  otherAllowanceWithoutTax: 800,

  oneAndOneThirdHoursForTaxable: 4,
  oneAndTwoThirdsHoursForTaxable: 3,
  twoHoursForTaxable: 2,
  twoAndOneThirdsHoursForTaxable: 1,
  twoAndTwoThirdsHoursForTaxable: 0.5,
  oneAndOneThirdsHoursForNonTax: 6,
  oneAndTwoThirdsHoursForNonTax: 5,
  twoHoursForNonTax: 4,
  twoAndOneThirdsHoursForNonTax: 3,
  twoAndTwoThirdsHoursForNonTax: 2,
  leavePayoutHours: 8,
  sickLeaveHours: 16,
  personalLeaveHours: 8,

  isLaborInsurance: true,
  isNHI: false,
  isLaborPension: true,
  nhiBackPremium: 500,
  secondGenNhiTax: 120,
  otherAdjustments: 300,
  voluntaryPensionContribution: 2160,
  numberOfDependents: 2,
};

const FALLBACK_MONTH = MONTHS[0];

describe("表單狀態 → 引擎輸入 → 表單狀態", () => {
  it("來回一趟之後每一個欄位都相同", () => {
    const restored = fromCalculatorOptions(
      toCalculatorOptions(FORM),
      FALLBACK_MONTH,
    );

    expect(restored).toEqual(FORM);
  });

  it("兩個方向的欄位集合一致 —— 任一邊加欄位而另一邊沒跟上就會紅", () => {
    const restored = fromCalculatorOptions(
      toCalculatorOptions(FORM),
      FALLBACK_MONTH,
    );

    expect(Object.keys(restored).sort()).toEqual(Object.keys(FORM).sort());
  });

  it("外籍、非固定天數、未入職未離職的組合也能還原", () => {
    const variant: ISalaryCalculatorFormState = {
      ...FORM,
      taxResidencyStatus: TaxResidencyStatus.NON_TAIWAN,
      payrollDaysBase: PayrollDaysBase.ACTUAL,
      isJoined: false,
      // Info: (20260831 - Julian) 開關關掉時日期不會被存下來，還原成 "01"（見下一條）
      dayOfJoining: "01",
      isLeft: false,
      isLaborInsurance: false,
      isLaborPension: false,
    };

    expect(
      fromCalculatorOptions(toCalculatorOptions(variant), FALLBACK_MONTH),
    ).toEqual(variant);
  });

  /**
   * Info: (20260831 - Julian) 唯一一處刻意不可逆：開關關掉時，日期不進快照。
   *
   * `employeeStartDate` 只在 `isJoined` 為真時才有值，所以「沒入職但曾經選過 15 號」
   * 這個組合還原後會變成 "01"。那是對的 —— 開關關著時那個日期不參與計算，
   * 保存它等於讓一個看不到的值在紀錄裡漂著。這一條把它釘成已知行為，
   * 而不是留給下一個人當成 bug 修。
   */
  it("入職開關關著時日期不進快照，還原成 01", () => {
    const restored = fromCalculatorOptions(
      toCalculatorOptions({ ...FORM, isJoined: false, dayOfJoining: "15" }),
      FALLBACK_MONTH,
    );

    expect(restored.isJoined).toBe(false);
    expect(restored.dayOfJoining).toBe("01");
  });

  it("離職日回得來，且不會退一天（寫入端是 UTC 午夜，讀取端必須也用 UTC）", () => {
    const leaving: ISalaryCalculatorFormState = {
      ...FORM,
      isLeft: true,
      dayOfLeaving: "31",
    };

    const restored = fromCalculatorOptions(
      toCalculatorOptions(leaving),
      FALLBACK_MONTH,
    );

    expect(restored.isLeft).toBe(true);
    expect(restored.dayOfLeaving).toBe("31");
  });
});

describe("引擎輸入 → 表單狀態", () => {
  it("可選欄位沒帶時補 0 / 預設值，不會讓輸入框變成非受控元件", () => {
    const minimal: ISalaryCalculatorOptions = {
      year: 2026,
      month: 8,
      baseSalaryTaxable: 30000,
      baseSalaryTaxFree: 0,
    };

    const restored = fromCalculatorOptions(minimal, FALLBACK_MONTH);

    expect(restored.otherAllowanceWithTax).toBe(0);
    expect(restored.numberOfDependents).toBe(0);
    expect(restored.leavePayoutHours).toBe(0);
    // Info: (20260831 - Julian) 三個投保旗標的預設是「有保」，與計算機的初始狀態一致
    expect(restored.isLaborInsurance).toBe(true);
    expect(restored.isNHI).toBe(true);
    expect(restored.isLaborPension).toBe(true);
  });

  it("認不得的行業別代碼退回預設的 42，而不是讓畫面空掉", () => {
    const restored = fromCalculatorOptions(
      {
        year: 2026,
        month: 8,
        baseSalaryTaxable: 30000,
        baseSalaryTaxFree: 0,
        job: 99999,
      },
      FALLBACK_MONTH,
    );

    expect(restored.industryCategory.CODE).toBe(42);
  });

  it("月份超出範圍時退回 fallback，不會拿到 undefined", () => {
    const restored = fromCalculatorOptions(
      {
        year: 2026,
        month: 13,
        baseSalaryTaxable: 30000,
        baseSalaryTaxFree: 0,
      },
      FALLBACK_MONTH,
    );

    expect(restored.selectedMonth).toEqual(FALLBACK_MONTH);
  });
});
