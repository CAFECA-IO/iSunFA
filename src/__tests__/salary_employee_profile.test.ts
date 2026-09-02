import { describe, it, expect } from "@jest/globals";
import { EmploymentType } from "@/interfaces/salary_calculator";
import { ISalaryEmployeeProfile } from "@/interfaces/salary_record";
import { readFileSync } from "fs";
import { join } from "path";
import {
  DEFAULT_EMPLOYEE_PROFILE,
  diffEmployeeProfile,
  EMPLOYEE_PROFILE_KEYS,
  EMPLOYMENT_TYPE_KEYS,
  PROFILE_FIELD_I18N_KEY,
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

describe("DEFAULT_EMPLOYEE_PROFILE 與 schema 的 @default 一致", () => {
  const schema = readFileSync(
    join(process.cwd(), "prisma", "schema.prisma"),
    "utf-8",
  );
  const block = schema.slice(
    schema.indexOf("model SalaryCalculatorEmployee"),
    schema.indexOf("model SalaryRecord"),
  );

  /**
   * Info: (20260902 - Julian) 三個地方各有一份預設值：schema 的 `@default`、
   * 這支常數、以及計算機的初始 state。schema 那一份沒辦法引用 TS 常數，
   * 所以只能用掃描對拍 —— 不同步的症狀是「從員工列表新增的人」與
   * 「直接寫進資料庫的人」預設值不同，而兩邊都不會報錯。
   */
  it.each([
    ["industryCode", "Int @default(42)"],
    ["isForeignWorker", "Boolean @default(false)"],
    ["employmentType", 'String @default("FULL_TIME")'],
    ["baseSalary30Days", "Boolean @default(true)"],
    ["isLaborInsured", "Boolean @default(true)"],
    ["isHealthInsured", "Boolean @default(true)"],
    ["isPensionInsured", "Boolean @default(true)"],
    ["dependentsCount", "Int @default(0)"],
    ["voluntaryPensionRate", "Int @default(0)"],
  ])("%s 的常數與 schema 對得起來", (field, declaration) => {
    /**
     * Info: (20260902 - Julian) 用 regex 不是 `toContain`：prisma format 會把欄位對齊，
     * 於是 `isLaborInsured` 與 `Boolean` 之間有三個空白而 `isPensionInsured` 只有一個。
     * 寫死單一空白的話，這條會隨「哪一個欄位名最長」而時紅時綠。
     */
    expect(block).toMatch(
      new RegExp(
        `${field}\\s+${declaration.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      ),
    );

    const value = DEFAULT_EMPLOYEE_PROFILE[
      field as keyof typeof DEFAULT_EMPLOYEE_PROFILE
    ];
    const inSchema = declaration.slice(
      declaration.indexOf("(") + 1,
      declaration.lastIndexOf(")"),
    );

    expect(`${typeof value === "string" ? `"${value}"` : value}`).toBe(inSchema);
  });

  // Info: (20260902 - Julian) 兩個日期欄沒有 default，常數這邊也必須是 null 而不是 0
  it("到職／離職日的預設是 null（0 是 1970 年，一個合法但錯的日期）", () => {
    expect(DEFAULT_EMPLOYEE_PROFILE.hireDate).toBeNull();
    expect(DEFAULT_EMPLOYEE_PROFILE.resignDate).toBeNull();
  });

  it("預設的 employmentType 是合法的鍵", () => {
    expect(EMPLOYMENT_TYPE_KEYS).toContain(
      DEFAULT_EMPLOYEE_PROFILE.employmentType,
    );
  });
});

const SRC = join(process.cwd(), "src");

const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const readSource = (...segments: string[]): string =>
  stripComments(readFileSync(join(SRC, ...segments), "utf-8"));

describe("15 個欄位在三條路徑上都沒有被漏掉", () => {
  /**
   * Info: (20260902 - Julian) 對話框要寫得出每一欄的名字。
   *
   * 型別上 `Record<keyof ISalaryEmployeeProfile, string>` 已經擋住「少一欄」，
   * 這一條擋的是另一半：路徑打錯字。字典裡沒有的話，畫面上會直接顯示
   * `calculator.xxx.yyy` 這串字 —— 而 `i18n_keys.test.ts` 掃得到它，
   * 前提是這裡的值是字面字串而不是組出來的。
   */
  it("每一欄都有 i18n 路徑，且都是字面字串", () => {
    expect(Object.keys(PROFILE_FIELD_I18N_KEY).sort()).toEqual(
      [...EMPLOYEE_PROFILE_KEYS].sort(),
    );

    for (const path of Object.values(PROFILE_FIELD_I18N_KEY)) {
      expect(path).toMatch(/^calculator\.[a-z_]+\.[a-z0-9_]+$/);
    }
  });

  /**
   * Info: (20260902 - Julian) 「直接新增員工」必須帶計算機當下的值。
   *
   * 帶 `DEFAULT_EMPLOYEE_PROFILE` 的話會編譯通過但語意錯了：使用者剛把
   * 14 個欄位設好，建出來的檔卻是預設值，下個月選他就把設定洗掉。
   * 型別擋不住這件事，所以用掃描。
   */
  it("直接新增員工帶的是 getEmployeeProfile()，不是預設值", () => {
    const section = readSource(
      "components",
      "salary_calculator",
      "salary_result_section.tsx",
    );

    expect(section).toContain("...getEmployeeProfile(),");
    expect(section).not.toContain("DEFAULT_EMPLOYEE_PROFILE");
  });

  /**
   * Info: (20260902 - Julian) 編輯員工不能弄丟沒有介面的欄位。
   *
   * 這張表單把 13 欄放進一個 `profile` state 再整組送出。
   * 改成逐欄列舉的話，漏掉的那一欄會落到 schema 的 `@default` ——
   * 也就是「改個名字順便重設投保狀態」，而畫面上沒有任何提示。
   */
  it("員工表單整組送出 profile，不是逐欄列舉", () => {
    const modal = readSource(
      "components",
      "salary_calculator",
      "employee_action_modal.tsx",
    );

    expect(modal).toContain("...profile,");
    // Info: (20260902 - Julian) 新增時的初值來自 DEFAULT，編輯時來自 data
    expect(modal).toContain("data ?? DEFAULT_EMPLOYEE_PROFILE");
  });

  /**
   * Info: (20260902 - Julian) 連結員工之後，到職／離職日在計算機上是唯讀的。
   *
   * 產品決策（20260902）。留成可改的話，同一格會有兩種語意
   * 「改這次試算」與「改這個人的到職日」，而使用者無從分辨。
   * **未連結時仍然可改** —— 公開版沒有員工檔，無條件唯讀會讓那兩格永遠設不了。
   */
  it("到職／離職日在連結員工時唯讀，未連結時仍可編輯", () => {
    const form = readSource(
      "components",
      "salary_calculator",
      "basic_info_form.tsx",
    );

    expect(form).toContain("const isJoinLeaveLocked = selectedEmployeeId !== null");
    // Info: (20260902 - Julian) 開關要停用，但仍然看得到狀態（藏起來會讓人看不出有沒有中途到職）
    expect(form).toContain("disabled={isJoinLeaveLocked}");
    // Info: (20260902 - Julian) 兩個分支都要在：只有唯讀那一支的話公開版就設不了
    expect(form).toContain("isJoined && isJoinLeaveLocked");
    expect(form).toContain("isJoined && !isJoinLeaveLocked");
    expect(form).toContain("isLeft && isJoinLeaveLocked");
    expect(form).toContain("isLeft && !isJoinLeaveLocked");
  });

  /**
   * Info: (20260902 - Julian) 到職／離職日的來源是 state 上的完整日期，不是畫面上的推導值。
   *
   * `getEmployeeProfile()` 若從 `isJoined`/`dayOfJoining` 反推回去，
   * 「員工 8/15 到職、使用者切到九月試算」會推出 `hireDate: null` ——
   * 而那個值會被拿去比對差異甚至回寫，於是算一次九月的薪水就把到職日洗掉了。
   */
  it("getEmployeeProfile 直接帶日期，不從當月推導值反推", () => {
    const context = readSource("contexts", "calculator_context.tsx");
    const profileBlock = context.slice(
      context.indexOf("const getEmployeeProfile"),
      context.indexOf("const getSalaryCalculatorOptions"),
    );

    expect(profileBlock).toContain("hireDate,");
    expect(profileBlock).toContain("resignDate,");
    expect(profileBlock).not.toContain("composeJoinLeaveDates");
  });
});

describe("員工表單的分頁與必填提示不會各說各話", () => {
  const modal = readSource(
    "components",
    "salary_calculator",
    "employee_action_modal.tsx",
  );

  /**
   * Info: (20260902 - Julian) 分頁化之後，必填欄位散在四個分頁裡。
   *
   * 「送出鈕是灰的、但當下這一頁看不出哪裡有問題」是分頁天生會帶進來的缺陷，
   * 而它完全靜默 —— 使用者只會覺得按鈕壞了。兩道配套缺一不可：
   * 分頁上的紅點（該去哪一頁）與按鈕旁的原因（要改什麼）。
   *
   * 本專案不 render React，所以這裡用掃描守「三者同源」——
   * 真正的判準是下面那條：`submitDisabled` 必須從 `issues` 推導，
   * 不能自己再寫一次條件。
   */
  it("停用條件、紅點、原因三者同源（issues 一張表推出來）", () => {
    expect(modal).toContain("const submitDisabled = issues.length > 0 || isSubmitting");
    expect(modal).toContain("const tabIssues = new Set(issues.map((issue) => issue.tab))");
    expect(modal).toContain("const blockingReason = issues[0]?.message ?? null");
  });

  /**
   * Info: (20260902 - Julian) `submitDisabled` 不得自己再列一次條件。
   *
   * 這是這一組最容易走樣的地方：日後加一個必填欄位，只改 `submitDisabled`
   * 而忘了加進 `issues` —— 症狀就是按鈕永遠灰的、四個分頁都沒有紅點。
   */
  it("停用條件沒有繞過 issues 自己判斷", () => {
    const block = modal.slice(
      modal.indexOf("const submitDisabled"),
      modal.indexOf("const isAdd"),
    );

    expect(block).not.toContain("nameInput");
    expect(block).not.toContain("numberInput");
    expect(block).not.toContain("baseSalaryInput");
    expect(block).not.toContain("isEmailValid");
  });

  /**
   * Info: (20260902 - Julian) 四個分頁都要有標籤鍵，否則那一頁的標題會是空的。
   *
   * 期望值用 `join(".")` 組而不是寫成 `` `calculator.employee_list.section_${tab}` ``：
   * 這個檔案自己也在 `i18n_keys.test.ts` 的掃描根裡，寫成完整的樣板會被當成
   * 一個未登記的動態鍵而讓那一支紅。
   */
  it.each(["identity", "pay", "insurance", "other"])(
    "分頁 %s 在標籤字典裡有對應的字面鍵",
    (tab) => {
      expect(modal).toContain(
        ["calculator", "employee_list", `section_${tab}`].join("."),
      );
    },
  );

  /**
   * Info: (20260902 - Julian) 非當前分頁用 `hidden` 藏起來，不是解除掛載。
   *
   * 解除掛載的話 `AmountInput` 會重新初始化 —— 它的 `displayValue` 是由
   * `value` 推導的，所以值不會掉，但使用者「打到一半切分頁再切回來」
   * 的中途狀態（例如 `1.`）會被抹掉。四個分頁一起掛著的成本遠低於這個。
   */
  it("非當前分頁是 hidden 而不是解除掛載", () => {
    for (const tab of ["identity", "pay", "insurance", "other"]) {
      expect(modal).toContain(
        `activeTab === "${tab}" ? "flex flex-col gap-[16px]" : "hidden"`,
      );
    }
  });
});
