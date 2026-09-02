import { describe, it, expect } from "@jest/globals";
import { EmploymentType } from "@/interfaces/salary_calculator";
import { ISalaryEmployeeProfile } from "@/interfaces/salary_record";
import {
  diffEmployeeProfile,
  EMPLOYEE_PROFILE_KEYS,
  EMPLOYMENT_TYPE_KEYS,
} from "@/lib/utils/salary_employee_profile";

/**
 * Info: (20260902 - Julian) 員工檔常態屬性的分類表與差異偵測。
 *
 * ## 這一支擋的是什麼：分類分錯方向
 *
 * 「選好員工姓名就自動匯入資料」這個功能，唯一真正的判準是
 * **哪些欄位屬於員工、哪些屬於這個月**。代價不對稱：
 *
 * - 該存卻沒存 → 使用者每個月重打一次（吵，但看得見）
 * - **不該存卻存了 → 下個月選了員工就自動帶上個月的加班時數，
 *   畫面完全正常而薪水是錯的（靜默，而且是對外憑據）**
 *
 * `ISalaryCalculatorFormState` 有 34 個欄位，本次分成
 * 期間 2 / 常態 16 / 當月變動 16。下面第一個 describe 就是那條線的判準：
 * 三份清單必須恰好蓋滿 34 個鍵、互不重疊，而常態那一份必須與
 * `ISalaryEmployeeProfile` 對得起來。
 *
 * 型別上另有一道：`EMPLOYEE_PROFILE_FIELDS` 宣告成
 * `Record<keyof ISalaryEmployeeProfile, true>`，介面加一欄而分類表沒加會
 * **編譯失敗**。那道守的是「忘了分類」，這一支守的是「分錯邊」——
 * 兩者都需要，因為把 `sickLeaveHours` 加進 `ISalaryEmployeeProfile`
 * 是完全合法的一次編譯。
 */

/**
 * Info: (20260902 - Julian) 34 個表單欄位的三份清單，**手寫、不從程式碼推導**。
 *
 * 從 `EMPLOYEE_PROFILE_KEYS` 推導的話，這一支就會跟著它一起錯 ——
 * 有人把加班時數搬進去，兩邊同時變、測試照樣全綠。
 * 這裡是獨立的一份宣告，與計畫書 §1 的表格逐字對應。
 */
const PERIOD_FIELDS = ["selectedYear", "selectedMonth"] as const;

const PROFILE_FORM_FIELDS = [
  "industryCategory",
  "taxResidencyStatus",
  "isJoined",
  "dayOfJoining",
  "isLeft",
  "dayOfLeaving",
  "payrollDaysBase",
  "baseSalary",
  "mealAllowance",
  "otherAllowanceWithTax",
  "otherAllowanceWithoutTax",
  "isLaborInsurance",
  "isNHI",
  "isLaborPension",
  "voluntaryPensionContribution",
  "numberOfDependents",
] as const;

const MONTHLY_FIELDS = [
  "oneAndOneThirdHoursForTaxable",
  "oneAndTwoThirdsHoursForTaxable",
  "twoHoursForTaxable",
  "twoAndOneThirdsHoursForTaxable",
  "twoAndTwoThirdsHoursForTaxable",
  "oneAndOneThirdsHoursForNonTax",
  "oneAndTwoThirdsHoursForNonTax",
  "twoHoursForNonTax",
  "twoAndOneThirdsHoursForNonTax",
  "twoAndTwoThirdsHoursForNonTax",
  "leavePayoutHours",
  "sickLeaveHours",
  "personalLeaveHours",
  "nhiBackPremium",
  "secondGenNhiTax",
  "otherAdjustments",
] as const;

const PROFILE: ISalaryEmployeeProfile = {
  baseSalary: 36000,
  mealAllowance: 3000,
  otherAllowanceTaxable: 2000,
  otherAllowanceTaxFree: 0,
  industryCode: 42,
  isForeignWorker: false,
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

describe("34 個表單欄位的分類", () => {
  it("三份清單恰好蓋滿 34 個欄位，且互不重疊", () => {
    const all = [...PERIOD_FIELDS, ...PROFILE_FORM_FIELDS, ...MONTHLY_FIELDS];

    expect(all).toHaveLength(34);
    expect(new Set(all).size).toBe(34);
  });

  /**
   * Info: (20260902 - Julian) **這是整支測試的重點。**
   *
   * 16 個當月變動欄位一個都不能出現在員工檔上。實測 mutation：
   * 把 `sickLeaveHours` 加進 `ISalaryEmployeeProfile` 與分類表 → 這一條紅。
   *
   * 比對用「名字」而不是型別，因為兩邊的命名本來就不同
   * （`otherAllowanceWithTax` vs `otherAllowanceTaxable`）——
   * 所以下面用一張明確的對照表，而不是字串相等。
   */
  it("當月變動的 16 個欄位，一個都沒混進員工檔", () => {
    const monthlyOnProfile = MONTHLY_FIELDS.filter((field) =>
      (EMPLOYEE_PROFILE_KEYS as string[]).includes(field),
    );

    expect(monthlyOnProfile).toEqual([]);
  });

  /**
   * Info: (20260902 - Julian) 表單的 16 個常態欄位 ↔ 員工檔的 15 個欄位。
   *
   * 不是一對一：到職／離職的四個表單欄位（`isJoined` + `dayOfJoining`、
   * `isLeft` + `dayOfLeaving`）在員工檔上收斂成兩個完整日期，
   * 而 `employmentType` 不在 form state 裡（context 另外持有）。
   * 16 - 4 + 2 + 1 = 15 ✅
   */
  it("常態欄位與員工檔的對照沒有漏接（16 → 15）", () => {
    const FORM_TO_PROFILE: Record<string, keyof ISalaryEmployeeProfile> = {
      industryCategory: "industryCode",
      taxResidencyStatus: "isForeignWorker",
      isJoined: "hireDate",
      dayOfJoining: "hireDate",
      isLeft: "resignDate",
      dayOfLeaving: "resignDate",
      payrollDaysBase: "baseSalary30Days",
      baseSalary: "baseSalary",
      mealAllowance: "mealAllowance",
      otherAllowanceWithTax: "otherAllowanceTaxable",
      otherAllowanceWithoutTax: "otherAllowanceTaxFree",
      isLaborInsurance: "isLaborInsured",
      isNHI: "isHealthInsured",
      isLaborPension: "isPensionInsured",
      voluntaryPensionContribution: "voluntaryPensionRate",
      numberOfDependents: "dependentsCount",
    };

    // Info: (20260902 - Julian) 每一個常態表單欄位都要有對應
    expect(Object.keys(FORM_TO_PROFILE).sort()).toEqual(
      [...PROFILE_FORM_FIELDS].sort(),
    );

    /**
     * Info: (20260902 - Julian) 反方向：員工檔上每一欄都要有來源。
     * `employmentType` 是唯一的例外 —— 它不在 form state 裡，
     * 由 context 另外持有（而且在此之前它沒有任何讀者）。
     */
    const covered = new Set(Object.values(FORM_TO_PROFILE));
    const uncovered = EMPLOYEE_PROFILE_KEYS.filter(
      (key) => !covered.has(key),
    );
    expect(uncovered).toEqual(["employmentType"]);
  });

  it("員工檔剛好 15 欄", () => {
    expect(EMPLOYEE_PROFILE_KEYS).toHaveLength(15);
  });
});

describe("employmentType 的值域", () => {
  // Info: (20260902 - Julian) 落地存的是鍵不是顯示字串，兩者容易混
  it("是 EmploymentType 的鍵，不是顯示字串", () => {
    expect(EMPLOYMENT_TYPE_KEYS).toEqual(["FULL_TIME", "PART_TIME"]);
    expect(EMPLOYMENT_TYPE_KEYS).not.toContain(EmploymentType.FULL_TIME);
  });
});

describe("diffEmployeeProfile", () => {
  it("一模一樣時沒有差異（否則儲存流程每次都會多問一句）", () => {
    expect(diffEmployeeProfile(PROFILE, { ...PROFILE })).toEqual([]);
  });

  it("逐欄列出 before / after，不是只回一個布林", () => {
    const diff = diffEmployeeProfile(
      { ...PROFILE, dependentsCount: 1 },
      PROFILE,
    );

    expect(diff).toEqual([
      { field: "dependentsCount", before: 0, after: 1 },
    ]);
  });

  it("多欄同時改，順序照分類表不照物件建構順序", () => {
    const diff = diffEmployeeProfile(
      { ...PROFILE, voluntaryPensionRate: 6, baseSalary: 40000 },
      PROFILE,
    );

    expect(diff.map((entry) => entry.field)).toEqual([
      "baseSalary",
      "voluntaryPensionRate",
    ]);
  });

  /**
   * Info: (20260902 - Julian) 金額比對前取整，否則每次儲存都會跳對話框。
   *
   * 表單裡是 `number`、資料庫是 `BigInt`，來回一趟可能差一個 0.0000001。
   * 使用者看到的是「差異：本薪 36000 → 36000」——比不問更糟，
   * 因為他會學會直接關掉它，而真的有差異那次也一起被關掉了。
   */
  it("浮點誤差不算差異", () => {
    expect(
      diffEmployeeProfile(
        { ...PROFILE, baseSalary: 36000.0000001 },
        PROFILE,
      ),
    ).toEqual([]);
  });

  // Info: (20260902 - Julian) 但真的差一塊錢要算 —— 上面那條不能寬到把它一起吃掉
  it("差一塊錢要算差異", () => {
    expect(
      diffEmployeeProfile({ ...PROFILE, baseSalary: 36001 }, PROFILE),
    ).toHaveLength(1);
  });

  it("布林與 null 的變化也算", () => {
    expect(
      diffEmployeeProfile({ ...PROFILE, isLaborInsured: false }, PROFILE),
    ).toHaveLength(1);
    expect(
      diffEmployeeProfile({ ...PROFILE, hireDate: 1756684800 }, PROFILE),
    ).toHaveLength(1);
  });
});
