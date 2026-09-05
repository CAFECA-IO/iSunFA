import { ISalaryRecordDetail } from "@/interfaces/salary_record";
import {
  PAY_SLIP_CSV_IDENTITY_LABELS,
  PAY_SLIP_FIELD_LABELS,
} from "@/constants/pay_slip_labels";

/**
 * Info: (20260904 - Julian) 薪資紀錄的 CSV 匯出（純函式）。
 *
 * 一列一筆薪資單，欄位攤平成薪資單上的每一格 —— 這份檔案的用途是對帳、申報、
 * 匯進其他系統，而那些用途都需要分項而不是總額。
 *
 * ## 做法沿用 `attendance_roster_csv.ts`
 *
 * 那支已經處理過本專案 CSV 的三個坑（公式注入、跳脫順序、BOM + CRLF），
 * 而它們與資料內容無關 —— 是「產給試算表的檔案」這件事本身的坑。
 * 這裡照抄它的判斷，並在下面各自註明理由，不是為了重複而是因為
 * 那三段推理在這裡一字不差地成立。
 */

/**
 * Info: (20260904 - Julian) 試算表會把 `=` `+` `-` `@`（及 TAB / CR）開頭的欄位當**公式求值**。
 *
 * 員工姓名是人打的。一個叫 `=HYPERLINK("http://…","點我")` 的員工，
 * 會讓這份薪資報表在會計的 Excel 裡變成一個可點的連結。
 *
 * **加引號沒有用** —— `"=1+1"` 一樣會被求值；唯一有效的是在前面補一個單引號，
 * 那是試算表的「這一欄是文字」標記（Excel 內不顯示，純文字編輯器看得到）。
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/**
 * Info: (20260904 - Julian) 先中和公式再加引號，**順序不可對調**。
 *
 * 對調的話 `=1+1,x` 會變成 `"=1+1,x"`，引號跑到最前面，
 * 單引號就補不到真正的開頭，中和完全失效而檔案看起來一切正常。
 */
const escapeField = (value: string): string => {
  const neutralized = FORMULA_TRIGGER.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(neutralized)
    ? `"${neutralized.replace(/"/g, '""')}"`
    : neutralized;
};

const toRow = (fields: readonly string[]): string =>
  fields.map(escapeField).join(",");

/**
 * Info: (20260904 - Julian) 金額一律輸出**不含千分位的整數字串**。
 *
 * 畫面上有 `1,234,567`，CSV 裡不能有 —— 帶逗號的數字進了試算表要嘛被
 * 當成文字（後續全部算不了），要嘛在某些地區設定下被拆成兩欄。
 * 這份檔案是拿去算的，不是拿去看的。
 */
const amount = (value: number): string => `${Math.round(value)}`;

/**
 * Info: (20260904 - Julian) 職災行業別費率是**比率不是金額**（例如 0.002）。
 *
 * 走 `amount()` 會四捨五入成 0，而一份寫著「職災行業別費率 0」的報表
 * 看起來完全正常。與 `pay_slip_html.ts` 的 `formatRate` 是同一個判斷。
 */
const rate = (value: number): string => `${value}`;

const period = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, "0")}`;

/**
 * Info: (20260904 - Julian) 寄出日輸出 `YYYY-MM-DD`（UTC）。
 *
 * 不用當地時間：這份檔案會在不同時區的機器之間傳，而「哪一天寄的」
 * 若隨開檔的人所在時區浮動，兩個人對同一份檔案會得到差一天的答案。
 * 未寄出留空字串 —— 填「未寄出」會讓那一欄變成不能排序的混合型別。
 */
const sentDate = (unixSeconds: number | null): string =>
  unixSeconds === null
    ? ""
    : new Date(unixSeconds * 1000).toISOString().slice(0, 10);

const L = PAY_SLIP_FIELD_LABELS;
const ID = PAY_SLIP_CSV_IDENTITY_LABELS;

/**
 * Info: (20260904 - Julian) 欄位順序＝表頭順序＝每一列的順序，由這一張表決定。
 *
 * 寫成「標題 + 取值」成對，而不是兩份各自維護的陣列：分成兩份的話，
 * 中間插一欄只改了其中一邊，整份檔案會從那一欄開始**每一格都錯位**，
 * 而它仍然是一份格式正確、打得開的 CSV。
 */
const COLUMNS: readonly {
  label: string;
  value: (record: ISalaryRecordDetail) => string;
}[] = [
  { label: ID.period, value: (r) => period(r.year, r.month) },
  { label: ID.employeeName, value: (r) => r.employee.name },
  { label: ID.employeeNumber, value: (r) => r.employee.number },

  {
    label: L.baseSalaryWithTax,
    value: (r) => amount(r.result.monthlySalary.baseSalaryWithTax),
  },
  {
    label: L.overtimePayWithTax,
    value: (r) => amount(r.result.monthlySalary.overtimePayWithTax),
  },
  {
    label: L.otherAllowanceWithTax,
    value: (r) => amount(r.result.monthlySalary.otherAllowanceWithTax),
  },
  {
    label: L.totalSalaryWithTax,
    value: (r) => amount(r.result.monthlySalary.totalSalaryWithTax),
  },
  {
    label: L.mealAllowanceWithoutTax,
    value: (r) => amount(r.result.monthlySalary.mealAllowanceWithoutTax),
  },
  {
    label: L.overtimePayWithoutTax,
    value: (r) => amount(r.result.monthlySalary.overtimePayWithoutTax),
  },
  {
    label: L.otherAllowanceWithoutTax,
    value: (r) => amount(r.result.monthlySalary.otherAllowanceWithoutTax),
  },
  {
    label: L.leaveSalaryWithoutTax,
    value: (r) => amount(r.result.monthlySalary.leaveSalaryWithoutTax),
  },
  {
    label: L.totalSalaryWithoutTax,
    value: (r) => amount(r.result.monthlySalary.totalSalaryWithoutTax),
  },
  {
    label: L.totalMonthlySalary,
    value: (r) => amount(r.result.monthlySalary.totalMonthlySalary),
  },

  {
    label: L.employeePaidLaborInsurance,
    value: (r) =>
      amount(r.result.employeeContribution.employeePaidLaborInsurance),
  },
  {
    label: L.employeePaidHealthInsurance,
    value: (r) =>
      amount(r.result.employeeContribution.employeePaidHealthInsurance),
  },
  {
    label: L.voluntaryPensionContribution,
    value: (r) =>
      amount(r.result.employeeContribution.voluntaryPensionContribution),
  },
  {
    label: L.withheldIncomeTax,
    value: (r) => amount(r.result.employeeContribution.withheldIncomeTax),
  },
  {
    label: L.withheldSecondGenerationNHIPremium,
    value: (r) =>
      amount(r.result.employeeContribution.withheldSecondGenerationNHIPremium),
  },
  {
    label: L.leaveDeductionTaxable,
    value: (r) => amount(r.result.employeeContribution.leaveDeductionTaxable),
  },
  {
    label: L.leaveDeductionTaxFree,
    value: (r) => amount(r.result.employeeContribution.leaveDeductionTaxFree),
  },
  {
    label: L.otherDeductionsOrAdjustments,
    value: (r) =>
      amount(r.result.employeeContribution.otherDeductionsOrAdjustments),
  },
  {
    label: L.totalEmployeeBurden,
    value: (r) => amount(r.result.employeeContribution.totalEmployeeBurden),
  },

  {
    label: L.healthInsuranceSalaryBracket,
    value: (r) => amount(r.result.insuredSalary.healthInsuranceSalaryBracket),
  },
  {
    label: L.laborInsuranceSalaryBracket,
    value: (r) => amount(r.result.insuredSalary.laborInsuranceSalaryBracket),
  },
  {
    label: L.employmentInsuranceSalaryBracket,
    value: (r) =>
      amount(r.result.insuredSalary.employmentInsuranceSalaryBracket),
  },
  {
    label: L.occupationalInjuryInsuranceSalaryBracket,
    value: (r) =>
      amount(r.result.insuredSalary.occupationalInjuryInsuranceSalaryBracket),
  },
  {
    label: L.laborPensionSalaryBracket,
    value: (r) => amount(r.result.insuredSalary.laborPensionSalaryBracket),
  },
  // Info: (20260904 - Julian) 比率欄，不走 amount() —— 見上面 `rate` 的說明
  {
    label: L.occupationalInjuryIndustryRate,
    value: (r) => rate(r.result.insuredSalary.occupationalInjuryIndustryRate),
  },
  {
    label: L.insuredSalary,
    value: (r) => amount(r.result.insuredSalary.insuredSalary),
  },

  {
    label: L.employerPaidLaborInsurance,
    value: (r) =>
      amount(r.result.employerContribution.employerPaidLaborInsurance),
  },
  {
    label: L.employerPaidHealthInsurance,
    value: (r) =>
      amount(r.result.employerContribution.employerPaidHealthInsurance),
  },
  {
    label: L.employerPaidPensionContribution,
    value: (r) =>
      amount(r.result.employerContribution.employerPaidPensionContribution),
  },
  {
    label: L.companyBurdenOccupationalAccidentInsurance,
    value: (r) =>
      amount(
        r.result.employerContribution
          .companyBurdenOccupationalAccidentInsurance,
      ),
  },
  {
    label: L.totalSalary,
    value: (r) => amount(r.result.employerContribution.totalSalary),
  },
  {
    label: L.totalEmployerCost,
    value: (r) => amount(r.result.employerContribution.totalEmployerCost),
  },

  { label: L.reported, value: (r) => amount(r.result.totalSalaryTaxable) },
  { label: L.paid, value: (r) => amount(r.result.totalPayment) },

  { label: ID.calculatorVersion, value: (r) => r.calculatorVersion },
  { label: ID.lastSentAt, value: (r) => sentDate(r.lastSentAt) },
  { label: ID.lastSentTo, value: (r) => r.lastSentTo ?? "" },
];

// Info: (20260904 - Julian) 匯出的欄位數，供測試對拍（手寫的期望值不從這裡推導）
export const SALARY_CSV_COLUMN_COUNT = COLUMNS.length;

export const buildSalaryRecordCsv = (
  records: readonly ISalaryRecordDetail[],
): string => {
  const lines = [
    toRow(COLUMNS.map((column) => column.label)),
    ...records.map((record) =>
      toRow(COLUMNS.map((column) => column.value(record))),
    ),
  ];

  /**
   * Info: (20260904 - Julian) BOM + CRLF。
   *
   * 沒有 BOM，Excel 會用系統預設編碼開啟，中文姓名與欄位名全成亂碼 ——
   * 而檔案本身是好的，問題只在開啟的那一端，所以回報起來會變成
   * 「你們匯出的檔案壞了」。CRLF 是因為 Excel 對純 LF 的容忍度依版本而異。
   */
  return `﻿${lines.join("\r\n")}\r\n`;
};
