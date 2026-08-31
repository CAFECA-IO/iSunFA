import { z } from "zod";
import {
  SALARY_INPUT_MAX_AMOUNT,
  SALARY_INPUT_MAX_HOURS,
} from "@/constants/salary_calculator";
import {
  ISalaryCalculatorEmployeeWriteInput,
  ISalaryRecordWriteInput,
} from "@/interfaces/salary_record";

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
export const salaryCalculatorEmployeeWriteSchema = z.object({
  name: z.string().trim().min(1).max(100),
  number: z.string().trim().max(50).optional(),
  email: z.email().max(254),
  baseSalary: amountSchema,
  mealAllowance: amountSchema,
});

/**
 * Info: (20260831 - Julian) 計算引擎的輸入契約（`ISalaryCalculatorOptions`）。
 *
 * 欄位順序與 `src/interfaces/salary_calculator.ts` 的宣告順序一致，方便對照；
 * 引擎那邊加欄位時，這裡沒跟上會在 `toSalaryRecordWriteInput` 的回傳型別上編譯失敗。
 */
export const salaryCalculatorOptionsSchema = z.object({
  year: z.number().int().min(2020).max(2100),
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

export const salaryRecordWriteSchema = z.object({
  employeeId: z.uuid(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  input: salaryCalculatorOptionsSchema,
  result: salaryCalculatorUiSchema,
  calculatorVersion: z.string().trim().min(1).max(20),
});

export const salaryRecordQuerySchema = z.object({
  employeeId: z.uuid().optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

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
