import { z } from "zod";
import {
  SALARY_INPUT_MAX_AMOUNT,
  SALARY_INPUT_MAX_HOURS,
  SALARY_RECORD_MIN_YEAR,
} from "@/constants/salary_calculator";
import { INDUSTRY_CATEGORY_OPTIONS } from "@/constants/industry_category";
import {
  MAX_PENSION_RATE_PERCENT,
  MIN_PENSION_RATE_PERCENT,
} from "@/lib/utils/salary_pension_rate";
import { EMPLOYMENT_TYPE_KEYS } from "@/lib/utils/salary_employee_profile";
import {
  ISalaryCalculatorEmployeeWriteInput,
  ISalaryProfileChangeContext,
  ISalaryRecordWriteInput,
} from "@/interfaces/salary_record";
import { SALARY_EXPORT_MAX_RECORDS } from "@/constants/salary_export";

/**
 * Info: (20260831 - Julian) 薪資計算機的 Payload 驗證。
 *
 * 依 CLAUDE.md §2，Zod schema 嚴禁寫在 `route.ts` 內 ——
 * route 只負責 `Schema.safeParse(body)`。
 *
 * ## 這一層比別的模組重要
 *
 * `SalaryRecord.inputSnapshot` / `resultSnapshot` 是 Json 欄位，
 * 資料庫端**沒有任何守門人**：欄位少一個、型別錯一個、多塞一坨無關的東西，
 * DB 都會照收。這個檔案是那兩欄唯一的形狀約束（計劃書 §2.2）。
 */

// Info: (20260831 - Julian) 金額（元）。UI 的輸入框產不出負數，所以負值代表有東西壞了
const amountSchema = z
  .number()
  .finite()
  .nonnegative()
  .max(SALARY_INPUT_MAX_AMOUNT);

// Info: (20260831 - Julian) 溢扣／補收是雙向的，不設非負
const signedAmountSchema = z
  .number()
  .finite()
  .min(-SALARY_INPUT_MAX_AMOUNT)
  .max(SALARY_INPUT_MAX_AMOUNT);

const hoursSchema = z
  .number()
  .finite()
  .nonnegative()
  .max(SALARY_INPUT_MAX_HOURS);

/**
 * Info: (20260831 - Julian) 計算結果的欄位一律只驗 finite。
 *
 * 它們是衍生值，不是使用者輸入：扣項大於薪資時 `totalPayment` 會是負的，
 * 而那是一個要如實存下來的事實，不是要擋掉的錯誤。
 */
const resultAmountSchema = z.number().finite();

// Info: (20260831 - Julian) 員工名單：新增與編輯共用
// Info: (20260831 - Julian) 編號是身分（帳本內唯一）故必填；Email 只在寄薪資單時要用，可省略
/**
 * Info: (20260902 - Julian) 行業別代碼的值域來自選項清單本身，不是一個手寫的 min/max。
 *
 * 代碼不連續（清單是 1–55 但中間有跳號），寫 `min(1).max(55)` 會放進不存在的代碼，
 * 而那會讓引擎查表落空。清單改版時這一條自己會跟著改。
 */
const industryCodeSchema = z
  .number()
  .int()
  .refine(
    (code) => INDUSTRY_CATEGORY_OPTIONS.some((item) => item.CODE === code),
    { message: "行業別代碼不在 INDUSTRY_CATEGORY_OPTIONS 裡" },
  );

/**
 * Info: (20260902 - Julian) 自提勞退費率，**百分點整數 0–6**，不是 0.06 那個小數。
 *
 * 收 `int()` 是這一條的重點：`0.06` 送進來會被擋下，而那正是呼叫端忘了走
 * `toPensionRatePercent()` 的症狀。若這裡放行小數，資料庫會同時存在
 * 「6」與「0.06」兩種寫法，而讀回來的人無從分辨。
 */
const pensionRatePercentSchema = z
  .number()
  .int()
  .min(MIN_PENSION_RATE_PERCENT)
  .max(MAX_PENSION_RATE_PERCENT);

/**
 * Info: (20260902 - Julian) 到職／離職日：Unix 秒，可為 null。
 *
 * `nullable()` 而不是 `optional()`：「沒有到職日」是一個要被明確送出來的狀態
 * （員工檔上真的沒填），而 `optional` 會讓「忘了帶這一欄」與「這個人沒有到職日」
 * 長得一模一樣 —— 那是 checklist §1.11 的「完全合法、只是錯的值」。
 */
const timestampSchema = z.number().int().nonnegative().nullable();

/**
 * Info: (20260902 - Julian) 員工檔上會被自動匯入計算機的常態屬性。
 *
 * 整組必填。少一欄就會落到 schema 的 `@default`，而那是靜默的：
 * 使用者在計算機設好、按「直接新增員工」，建出來的檔卻是預設值，
 * 下個月選他就把設定洗掉（計畫書 §4.3）。
 */
const employeeProfileShape = {
  baseSalary: amountSchema,
  mealAllowance: amountSchema,
  otherAllowanceTaxable: amountSchema,
  otherAllowanceTaxFree: amountSchema,
  industryCode: industryCodeSchema,
  isForeignWorker: z.boolean(),
  // Info: (20260902 - Julian) 值域取自 enum 的鍵，不寫死字串 —— 兩邊不會不同步
  employmentType: z
    .string()
    .refine((key) => EMPLOYMENT_TYPE_KEYS.includes(key), {
      message: "employmentType 必須是 EmploymentType 的鍵",
    }),
  baseSalary30Days: z.boolean(),
  isLaborInsured: z.boolean(),
  isHealthInsured: z.boolean(),
  isPensionInsured: z.boolean(),
  // Info: (20260902 - Julian) 扶養人數上限取 20：超過的話多半是打錯，而它會直接放大免稅額
  dependentsCount: z.number().int().min(0).max(20),
  voluntaryPensionRate: pensionRatePercentSchema,
  hireDate: timestampSchema,
  resignDate: timestampSchema,
};

/**
 * Info: (20260905 - Luphia) 留職停薪的起訖（#6774）。
 *
 * 與 profile 分開一組，理由見 `ISalaryEmployeeLeave`：它不是計算機的輸入。
 * 一樣整組必填 —— 可選的話，「編輯員工」少帶這兩欄就會把留停紀錄清成 null，
 * 而那是靜默的（畫面上留停區間就這樣不見了，下個月那幾個月變成缺漏）。
 */
const employeeLeaveShape = {
  leaveStartDate: timestampSchema,
  leaveEndDate: timestampSchema,
};

export const salaryCalculatorEmployeeWriteSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    number: z.string().trim().min(1).max(50),
    email: z.string().email().max(254).optional(),
    ...employeeProfileShape,
    ...employeeLeaveShape,
  })
  /**
   * Info: (20260902 - Julian) 離職日不得早於到職日。
   *
   * 兩者都合法、只是順序反了 —— 引擎不會報錯，它會算出一個「當月到職又當月離職」
   * 或「上個月離職但這個月才到職」的薪資，而那張薪資單是對外憑據。
   * 相等是允許的：當天到職當天離職雖然罕見，但它是一個真實的狀態。
   */
  .refine(
    (data) =>
      data.hireDate === null ||
      data.resignDate === null ||
      data.resignDate >= data.hireDate,
    { message: "離職日不得早於到職日", path: ["resignDate"] },
  )
  /**
   * Info: (20260905 - Luphia) 復職日不得早於留停起日（#6774）。
   *
   * 順序反了的話 `missingSalaryPeriods` 的區間是空的 —— 留停那幾個月不會被扣掉，
   * 於是每一個月都被標成「缺薪資單」。誤報的提示比沒有提示更糟：
   * 使用者會拿它去補一張本來就不該有的薪資單。
   *
   * `leaveStartDate` 為 null 而 `leaveEndDate` 有值不在這裡擋 —— 見下一條。
   */
  .refine(
    (data) =>
      data.leaveStartDate === null ||
      data.leaveEndDate === null ||
      data.leaveEndDate >= data.leaveStartDate,
    { message: "復職日不得早於留職停薪起日", path: ["leaveEndDate"] },
  )
  /**
   * Info: (20260905 - Luphia) 有復職日就必須有留停起日。
   *
   * 只填復職日是一個沒有意義的狀態，但它**不會報錯**：
   * `missingSalaryPeriods` 看 `leaveStartDate === null` 就整段跳過，
   * 那個復職日於是靜靜地不起作用。使用者以為登記好了。
   */
  .refine(
    (data) => data.leaveEndDate === null || data.leaveStartDate !== null,
    {
      message: "有復職日就必須填留職停薪起日",
      path: ["leaveStartDate"],
    },
  );

/**
 * Info: (20260831 - Julian) 計算引擎的輸入契約（`ISalaryCalculatorOptions`）。
 *
 * 欄位順序與 `src/interfaces/salary_calculator.ts` 的宣告順序一致，方便對照；
 * 引擎那邊加欄位時，這裡沒跟上會在 `toSalaryRecordWriteInput` 的回傳型別上編譯失敗。
 */
export const salaryCalculatorOptionsSchema = z.object({
  year: z.number().int().min(SALARY_RECORD_MIN_YEAR).max(2100),
  month: z.number().int().min(1).max(12),
  foreignWorker: z.boolean().optional(),
  job: z.number().int().positive().optional(),
  employeeStartDate: z.number().int().nonnegative().optional(),
  employeeEndDate: z.number().int().nonnegative().optional(),
  baseSalaryTaxable: amountSchema,
  baseSalaryTaxFree: amountSchema,
  otherAllowancesTaxable: amountSchema.optional(),
  otherAllowancesTaxFree: amountSchema.optional(),
  overTimeHoursTaxable100: hoursSchema.optional(),
  overTimeHoursTaxable133: hoursSchema.optional(),
  overTimeHoursTaxable166: hoursSchema.optional(),
  overTimeHoursTaxable200: hoursSchema.optional(),
  overTimeHoursTaxable233: hoursSchema.optional(),
  overTimeHoursTaxable266: hoursSchema.optional(),
  overTimeHoursTaxFree100: hoursSchema.optional(),
  overTimeHoursTaxFree133: hoursSchema.optional(),
  overTimeHoursTaxFree166: hoursSchema.optional(),
  overTimeHoursTaxFree200: hoursSchema.optional(),
  overTimeHoursTaxFree233: hoursSchema.optional(),
  overTimeHoursTaxFree266: hoursSchema.optional(),
  vacationToPayHours: hoursSchema.optional(),
  sickLeaveHours: hoursSchema.optional(),
  personalLeaveHours: hoursSchema.optional(),
  isLaborInsuranceEnrolled: z.boolean().optional(),
  isHealthInsuranceEnrolled: z.boolean().optional(),
  isPensionInsuranceEnrolled: z.boolean().optional(),
  employeeBurdenHealthInsurancePremiums: amountSchema.optional(),
  employeeBurdenSecondGenerationHealthInsurancePremiums:
    amountSchema.optional(),
  employeeBurdenOtherOverflowDeductions: signedAmountSchema.optional(),
  employeeBurdenPensionInsurance: amountSchema.optional(),
  dependentsCount: z.number().int().nonnegative().max(99).optional(),
  baseSalary30Days: z.boolean().optional(),
});

// Info: (20260831 - Julian) 計算結果（`ISalaryCalculatorUI`）
export const salaryCalculatorUiSchema = z.object({
  monthlySalary: z.object({
    baseSalaryWithTax: resultAmountSchema,
    overtimePayWithTax: resultAmountSchema,
    otherAllowanceWithTax: resultAmountSchema,
    totalSalaryWithTax: resultAmountSchema,
    mealAllowanceWithoutTax: resultAmountSchema,
    overtimePayWithoutTax: resultAmountSchema,
    otherAllowanceWithoutTax: resultAmountSchema,
    leaveSalaryWithoutTax: resultAmountSchema,
    totalSalaryWithoutTax: resultAmountSchema,
    totalMonthlySalary: resultAmountSchema,
  }),
  employeeContribution: z.object({
    employeePaidLaborInsurance: resultAmountSchema,
    employeePaidHealthInsurance: resultAmountSchema,
    voluntaryPensionContribution: resultAmountSchema,
    withheldIncomeTax: resultAmountSchema,
    withheldSecondGenerationNHIPremium: resultAmountSchema,
    leaveDeductionTaxable: resultAmountSchema,
    leaveDeductionTaxFree: resultAmountSchema,
    otherDeductionsOrAdjustments: resultAmountSchema,
    totalEmployeeBurden: resultAmountSchema,
  }),
  insuredSalary: z.object({
    healthInsuranceSalaryBracket: resultAmountSchema,
    laborInsuranceSalaryBracket: resultAmountSchema,
    employmentInsuranceSalaryBracket: resultAmountSchema,
    occupationalInjuryInsuranceSalaryBracket: resultAmountSchema,
    laborPensionSalaryBracket: resultAmountSchema,
    occupationalInjuryIndustryRate: resultAmountSchema,
    insuredSalary: resultAmountSchema,
  }),
  employerContribution: z.object({
    employerPaidLaborInsurance: resultAmountSchema,
    employerPaidHealthInsurance: resultAmountSchema,
    employerPaidPensionContribution: resultAmountSchema,
    companyBurdenOccupationalAccidentInsurance: resultAmountSchema,
    totalSalary: resultAmountSchema,
    totalEmployerCost: resultAmountSchema,
  }),
  totalPayment: resultAmountSchema,
  totalSalaryTaxable: resultAmountSchema,
});

export const salaryRecordWriteSchema = z
  .object({
    employeeId: z.string().uuid(),
    year: z.number().int().min(SALARY_RECORD_MIN_YEAR).max(2100),
    month: z.number().int().min(1).max(12),
    input: salaryCalculatorOptionsSchema,
    result: salaryCalculatorUiSchema,
    calculatorVersion: z.string().trim().min(1).max(20),
  })
  /**
   * Info: (20260901 - Julian) 年月在這個 payload 裡出現兩次，而且兩邊的用途完全不同。
   *
   * 外層的 `year`/`month` 是 `(帳本, 員工, 年, 月)` 唯一鍵的一半 —— 它決定
   * **覆寫哪一筆**；`input.year`/`input.month` 是快照，決定**載回計算機時顯示哪個月**。
   * 呼叫端（`salary_result_section.tsx` 與 `salary_calculator_snapshot.ts`）
   * 各自算一次，目前同源所以必然相等 —— 但那是巧合，不是約束（checklist §2.2：
   * 「兩邊各算一次就是『算的是 A、送的是 B』，而巧合能掩蓋很久」）。
   *
   * 它們不一致時的症狀最難查：紀錄掛在 8 月底下、載回來畫面寫著 9 月，
   * 兩個畫面對同一筆紀錄講不同的話，而且完全靜默。API 是對外的，
   * 所以這一條在伺服器端擋，不是在前端。
   */
  .refine((data) => data.year === data.input.year, {
    message: "year 與 input.year 必須一致",
    path: ["input", "year"],
  })
  .refine((data) => data.month === data.input.month, {
    message: "month 與 input.month 必須一致",
    path: ["input", "month"],
  });

export const salaryRecordQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  year: z.coerce
    .number()
    .int()
    .min(SALARY_RECORD_MIN_YEAR)
    .max(2100)
    .optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  /**
   * Info: (20260901 - Julian) 關鍵字：比對員工姓名與編號。
   *
   * 之所以在伺服器端做而不是前端過濾：這份列表是分頁的，
   * 前端過濾只會濾掉當前這 20 筆，使用者搜第 3 頁的人會得到「查無資料」。
   */
  keyword: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Info: (20260904 - Julian) CSV 匯出：要匯出哪幾筆。
 *
 * `uuid()` 而不是任意字串：這組 id 直接進 `where: { id: { in: [...] } }`，
 * 而 Prisma 對格式不符的 uuid 會丟出讀起來像故障的錯誤 —— 那是使用者
 * 送得出來的東西，該在門口擋下，不是讓它變成 500。
 *
 * `min(1)`：空清單匯出一個只有表頭的檔案，那不是使用者要的東西 ——
 * 前端也擋（沒勾就停用按鈕），但那是體驗，這裡是保證。
 *
 * `max()` 與 service 的檢查都保留：schema 擋的是形狀，service 擋的是額度，
 * 而 service 是唯一被單元測試覆蓋的那一層。
 */
export const salaryRecordExportSchema = z.object({
  recordIds: z.array(z.string().uuid()).min(1).max(SALARY_EXPORT_MAX_RECORDS),
});

export type ISalaryRecordExportPayload = z.infer<
  typeof salaryRecordExportSchema
>;

export type ISalaryCalculatorEmployeeWritePayload = z.infer<
  typeof salaryCalculatorEmployeeWriteSchema
>;
export type ISalaryRecordWritePayload = z.infer<typeof salaryRecordWriteSchema>;
export type ISalaryRecordQueryPayload = z.infer<typeof salaryRecordQuerySchema>;

/**
 * Info: (20260831 - Julian) 把驗過的 Payload 交給 service，同時在**編譯期**
 * 把 schema 與 `src/interfaces/salary_calculator.ts` 的型別綁在一起。
 *
 * 這兩個函式的回傳型別是這份 schema 唯一的正確性保證：Json 欄位在 DB 端沒有守門人，
 * 引擎的輸入契約改了而這裡沒跟上時，會在這一行編譯失敗，而不是在某個月的薪資單上。
 */
export const toSalaryRecordWriteInput = (
  payload: ISalaryRecordWritePayload,
): ISalaryRecordWriteInput => payload;

export const toSalaryCalculatorEmployeeWriteInput = (
  payload: ISalaryCalculatorEmployeeWritePayload,
): ISalaryCalculatorEmployeeWriteInput => payload;

/**
 * Info: (20260908 - Julian) 一次員工檔寫入的異動資訊（生效月份與原因）。
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md` §4
 *
 * ## 為什麼與 `salaryCalculatorEmployeeWriteSchema` 分開
 *
 * 那份是「員工現在是什麼樣子」，這一份是「這次修改這件事」。
 * 合成一份的話，生效月份會變成員工檔的一個屬性 —— 而它不是：
 * 同一位員工會有很多次異動，每一次有自己的生效月與原因。
 *
 * ## 三個欄位都是選填
 *
 * 舊版前端、以及計算機的「直接新增員工」那條路徑不會帶它們。
 * 缺漏時由 `toSalaryProfileChangeContext` 補上當期（見該函式）——
 * 讓它必填會讓那兩個既有入口在上線當天直接 400。
 */
/**
 * Info: (20260908 - Julian) 調薪歷程的查詢參數。
 *
 * ## 為什麼沒有期間範圍（from / to）
 *
 * 一位員工幾年下來的異動是**數十列**的量級，畫面一次載得完、翻頁也不痛。
 * 而 `(effectiveYear, effectiveMonth)` 的範圍比較在 Prisma 上要展開成
 * 四個 OR 子句（或另外加一個可排序的複合欄位）—— 那個複雜度換到的是
 * 一個沒有人抱怨過的篩選。
 *
 * 需要它的是匯出（PR E，外部觀眾要「某段期間的異動」），
 * 到那時候再決定要不要加欄位，而不是現在先猜。
 *
 * ## `fields` 為什麼是逗號分隔的字串
 *
 * query string 沒有陣列，而 `?fields=a&fields=b` 與 `?fields[]=a` 兩種寫法
 * 在不同的代理與框架下解析不一致。逗號分隔只有一種讀法。
 * 值域不在這裡驗 —— 認不得的欄位名在服務層自然篩不到任何列，
 * 而回 400 會讓「前端多送一個新欄位」變成整頁壞掉。
 */
export const salaryProfileChangeQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
  fields: z.string().trim().max(500).optional(),
});

export type ISalaryProfileChangeQueryPayload = z.infer<
  typeof salaryProfileChangeQuerySchema
>;

export const salaryProfileChangeSchema = z.object({
  effectiveYear: z
    .number()
    .int()
    .min(SALARY_RECORD_MIN_YEAR)
    .max(2100)
    .optional(),
  effectiveMonth: z.number().int().min(1).max(12).optional(),
  reason: z.string().trim().max(200).optional(),
});

export type ISalaryProfileChangePayload = z.infer<
  typeof salaryProfileChangeSchema
>;

/**
 * Info: (20260908 - Julian) Payload → 交給 service 的異動 context。
 *
 * ## `changedByUserId` 從參數進來，不從 payload
 *
 * 它由 route 從 DeWT 取（`sessionUser.id`）。**不收前端傳入** ——
 * 收的話，異動紀錄的「誰」就是可以偽造的，而那是這張表唯一不能妥協的欄位。
 * 型別上把它放在第二個參數，是讓「不可能不小心從 body 讀到它」成立。
 *
 * ## `now` 沒有預設值
 *
 * 生效月份缺漏時補當期，而「當期」需要一個時鐘。
 * 刻意不給預設 `new Date()`：一個藏在驗證層裡的時鐘，會讓
 * 「12/31 23:59 存的那一筆算哪個月」這種問題測不出來。
 * 由 route 顯式傳入，測試就餵得進固定時間。
 *
 * ## 補的是當期，而這是有損的
 *
 * 補登（4/20 才輸入 4 月起生效）與預先輸入（3/28 輸入 5 月起生效）
 * 都會被補成錯的月份。所以前端**應該**帶這兩個欄位 —— 補值是相容性的
 * 保險，不是預期路徑（計劃書 §4.1）。
 */
export const toSalaryProfileChangeContext = (
  payload: ISalaryProfileChangePayload,
  changedByUserId: string,
  now: Date,
): ISalaryProfileChangeContext => ({
  changedByUserId,
  effectiveYear: payload.effectiveYear ?? now.getFullYear(),
  effectiveMonth: payload.effectiveMonth ?? now.getMonth() + 1,
  reason: payload.reason,
});
