import { ISalaryRecordDetail } from "@/interfaces/salary_record";
import {
  PAY_SLIP_CSV_IDENTITY_LABELS,
  PAY_SLIP_CSV_INSURED_STATUS_LABELS,
  PAY_SLIP_FIELD_LABELS,
  PAY_SLIP_META_LABELS,
} from "@/constants/pay_slip_labels";
import {
  formatIsoDateUtc,
  paySlipMetaOf,
  PAY_SLIP_INSURED_FIELDS,
} from "@/lib/utils/pay_slip_meta";

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
const escapeField = (value: string, numeric = false): string => {
  /**
   * Info: (20260908 - Julian) `numeric` 的欄位不中和。
   *
   * ## 為什麼需要這個出口
   *
   * `FORMULA_TRIGGER` 包含 `-`，而 20260908 加入的「本薪較上一筆差額」
   * 是這份 CSV 第一個**可能為負**的欄位。減薪的 `-10000` 會被補成
   * `'-10000` —— 在 Excel 裡那是一格**文字**，於是整欄加總不起來、
   * 排序也是字典序。而檔案看起來完全正常。
   *
   * 在這之前所有金額都非負，所以這個坑一直沒有出現。
   *
   * ## 為什麼是 opt-out 而不是 opt-in
   *
   * 預設仍然中和。反過來（只對「使用者輸入的欄位」中和）需要正確標記
   * 每一個文字欄位，而標錯一個的後果是公式注入回來了。
   * 預設安全、明確標記例外，標錯的後果就只是「一個數字變成文字」。
   */
  const neutralized =
    !numeric && FORMULA_TRIGGER.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(neutralized)
    ? `"${neutralized.replace(/"/g, '""')}"`
    : neutralized;
};

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
 * Info: (20260909 - Julian) 到職日。**沒有的時候是空字串，不是「-」。**
 *
 * 與同一份檔案裡的 `sentDate` 同一個判斷：填一個佔位字串會讓那一欄
 * 變成排不了序的混合型別。而 `-` 更糟 —— 它是公式起始字元，
 * 會被 `escapeField` 補成 `'-`。
 *
 * 薪資單上則印「-」（那是給人看的，空白讀起來像漏了）。
 * 兩邊共用的是日期算法（`formatIsoDateUtc`），不是空值的處置。
 */
const hireDate = (unixSeconds: number | null): string =>
  unixSeconds === null ? "" : formatIsoDateUtc(unixSeconds);

/**
 * Info: (20260909 - Julian) 投保狀態的三欄，走與薪資單同一份欄位清單。
 *
 * 值也用同一組字（`投保` / `未投保`）：欄名為了自我描述而加長了
 *（見 `PAY_SLIP_CSV_INSURED_STATUS_LABELS`），但**值不加長** ——
 * 使用者會把 CSV 與 PDF 並排看，兩邊的值不同字就得先確認是不是同一件事。
 */
const INSURED_STATUS_COLUMNS = PAY_SLIP_INSURED_FIELDS.map((field) => ({
  label: PAY_SLIP_CSV_INSURED_STATUS_LABELS[field],
  value: (record: ISalaryRecordDetail): string =>
    paySlipMetaOf(null, record.input)[field]
      ? PAY_SLIP_META_LABELS.insuredYes
      : PAY_SLIP_META_LABELS.insuredNo,
}));

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
  // Info: (20260908 - Julian) 可能為負的數值欄位；見 `escapeField` 的 `numeric`
  numeric?: true;
}[] = [
  { label: ID.period, value: (r) => period(r.year, r.month) },
  { label: ID.employeeName, value: (r) => r.employee.name },
  { label: ID.employeeNumber, value: (r) => r.employee.number },
  /**
   * Info: (20260909 - Julian) 到職日排在身分那一段的最後（客戶場景 §6）。
   *
   * 勞檢對著工資清冊問的第一個問題就是「這個人什麼時候到職」——
   * 排在最後面的話，他得先橫向捲過四十幾個金額欄。
   */
  {
    label: PAY_SLIP_META_LABELS.hireDate,
    value: (r) => hireDate(r.employee.hireDate),
  },

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

  /**
   * Info: (20260909 - Julian) 投保狀態排在級距**前面**，與薪資單同一個順序。
   *
   * 未投保時級距是 0，而「勞保投保級距 0」讀起來像資料漏了，
   * 不像「這個人沒有投保」。先講狀態，右邊那幾個 0 才有解釋。
   */
  ...INSURED_STATUS_COLUMNS,

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

  /**
   * Info: (20260908 - Julian) 本薪與它的變動（計劃書 §18）。
   *
   * `月本薪（設定）` 與上面的 `本薪（應稅）` **不是同一件事**，兩個都留：
   * 前者是這個人這個月的本薪設定，後者是實際計入的金額 ——
   * 月中到職的人那兩個數字不一樣，而那個差異正是對帳要看的。
   *
   * 沒有值時一律留空字串，不填「無」或「0」：
   * 「0」會被加總，而「無」會讓那一欄變成不能排序的混合型別。
   */
  { label: ID.baseSalarySetting, value: (r) => amount(r.baseSalary) },
  {
    label: ID.baseSalaryPrevPeriod,
    value: (r) =>
      r.baseSalaryDelta === null
        ? ""
        : period(
            r.baseSalaryDelta.previousYear,
            r.baseSalaryDelta.previousMonth,
          ),
  },
  {
    label: ID.baseSalaryDelta,
    // Info: (20260908 - Julian) 唯一可能為負的欄位 —— 見 `escapeField` 的 `numeric`
    numeric: true,
    value: (r) =>
      r.baseSalaryDelta === null ? "" : amount(r.baseSalaryDelta.delta),
  },
  {
    /**
     * Info: (20260910 - Luphia) `before` 為 null 時留白，**不寫 0**（review 建-1）。
     *
     * 建檔那一列沒有「之前」。這一欄進的是**工資清冊** —— 寫 0 等於在勞檢
     * 調閱的檔案裡宣稱這個人先前的本薪是 0，而他從來沒有 0 過。
     * 留白與「這一筆沒有對應的異動紀錄」同一種表示：我們沒有這個值。
     */
    label: ID.profileChangeBefore,
    value: (r) =>
      r.baseSalaryChange === null || r.baseSalaryChange.before === null
        ? ""
        : amount(r.baseSalaryChange.before),
  },
  {
    // Info: (20260910 - Luphia) 同上；`after` 在「刪除員工」那一列是 null
    label: ID.profileChangeAfter,
    value: (r) =>
      r.baseSalaryChange === null || r.baseSalaryChange.after === null
        ? ""
        : amount(r.baseSalaryChange.after),
  },
  {
    label: ID.profileChangeReason,
    value: (r) => r.baseSalaryChange?.reason ?? "",
  },
  {
    label: ID.profileChangeBy,
    value: (r) => r.baseSalaryChange?.changedBy.name ?? "",
  },
  {
    label: ID.profileChangeAt,
    value: (r) =>
      r.baseSalaryChange === null
        ? ""
        : sentDate(r.baseSalaryChange.recordedAt),
  },

  { label: ID.calculatorVersion, value: (r) => r.calculatorVersion },
  { label: ID.lastSentAt, value: (r) => sentDate(r.lastSentAt) },
  { label: ID.lastSentTo, value: (r) => r.lastSentTo ?? "" },
];

// Info: (20260904 - Julian) 匯出的欄位數，供測試對拍（手寫的期望值不從這裡推導）
export const SALARY_CSV_COLUMN_COUNT = COLUMNS.length;

export const buildSalaryRecordCsv = (
  records: readonly ISalaryRecordDetail[],
): string => {
  /**
   * Info: (20260908 - Julian) 逐欄 escape，因為現在**每一欄的規則不一樣**了
   * （`numeric` 的不中和公式）。原本的 `toRow(strings)` 把整列當同一種處理，
   * 而那在有例外欄位之後就是錯的。
   *
   * 表頭一律走預設（中和）—— 標題是我們自己寫的常數，不會觸發，
   * 但沒有理由給它一個例外。
   */
  const lines = [
    COLUMNS.map((column) => escapeField(column.label)).join(","),
    ...records.map((record) =>
      COLUMNS.map((column) =>
        escapeField(column.value(record), column.numeric === true),
      ).join(","),
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
