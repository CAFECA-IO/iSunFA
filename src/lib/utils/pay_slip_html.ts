import { PDF_FONT_STACK } from "@/constants/pdf_font";
import { ISalaryCalculatorUI } from "@/interfaces/salary_calculator";
import { numberWithCommas } from "@/lib/utils/common";

/**
 * Info: (20260902 - Julian) 薪資單的列印用 HTML（純函式）。
 *
 * ## 為什麼不重用 `pay_slip.tsx`
 *
 * 那支是 React + Tailwind：`flex`、`grid-cols-2`、以及 `text-text-neutral-primary`
 * 這類由 `globals.css` 定義的 CSS 變數。列印走的是 headless Chrome 的
 * `page.setContent(html)` —— **那裡沒有 Tailwind 的建置產物，也沒有 globals.css**。
 * 直接把元件的 markup 搬過去，會得到一份沒有任何樣式、欄位擠成一行的薪資單。
 *
 * 所以這裡是另一份自帶 `<style>` 的 HTML，做法比照 `logistics_report_html.ts`
 * （同樣的處境，630 行）。代價是版面要維護兩份 —— 那是這條路的固有成本，
 * 換來的是列印結果不受前端建置流程影響。
 *
 * ## 為什麼用 table 而不是 flex
 *
 * 這份 HTML 未來也可能被內嵌進信件本文（目前產品決策是走 PDF 附件，見計畫書 D1）。
 * 信箱客戶端對 flex／grid 的支援極不一致，而 table 是唯一到處都一樣的排版方式。
 * 現在只餵給 Chrome，用 table 不吃虧；哪天要改內嵌就不必重寫。
 *
 * ## 文案為什麼寫死中文
 *
 * 專案沒有伺服器端的 i18n helper，`logistics_report_html.ts` 也是直接寫死中文。
 * 而且我們**不知道收件員工的語言** —— `SalaryCalculatorEmployee` 沒有語言欄位，
 * 他也不是本站使用者。硬挑一個語系不如挑一個明確的：與計算機畫面同樣的繁中。
 * 值域集中在下面這張表，日後要多語系時它變成參數，不必翻遍整個檔案。
 */

/**
 * Info: (20260902 - Julian) 欄位標籤。與 `zh_tw/calculator.ts` 的 `result` 區塊逐字對應。
 *
 * 不 import 那份字典：它是前端字典，形狀由 i18n 的需求決定，
 * 而這裡要的是「印在紙上的欄位名」。兩者今天相同，但沒有理由永遠相同 ——
 * 綁在一起的話，前端為了排版把某個標籤改短，寄出去的薪資單會跟著變。
 * 相同性由 `salary_pay_slip_html.test.ts` 對拍，不是靠共用一份資料結構。
 */
const LABELS = {
  baseSalaryWithTax: "本薪（應稅）",
  overtimePayWithTax: "加班費（應稅）",
  otherAllowanceWithTax: "其他加給（應稅）",
  totalSalaryWithTax: "總應稅薪資",
  mealAllowanceWithoutTax: "伙食費（免稅）",
  overtimePayWithoutTax: "加班費（免稅）",
  otherAllowanceWithoutTax: "其他津貼（免稅）",
  leaveSalaryWithoutTax: "休假折抵薪資（免稅）",
  totalSalaryWithoutTax: "總免稅薪資",
  totalMonthlySalary: "月薪資合計",

  employeePaidLaborInsurance: "自行負擔勞保費",
  employeePaidHealthInsurance: "自行負擔健保費",
  voluntaryPensionContribution: "自提勞退",
  withheldIncomeTax: "代扣所得稅款",
  withheldSecondGenerationNHIPremium: "代扣二代健保",
  leaveDeductionTaxable: "請假扣薪（應稅）",
  leaveDeductionTaxFree: "請假扣薪（免稅）",
  otherDeductionsOrAdjustments: "其他溢扣/ 補收",
  totalEmployeeBurden: "扣項總計",

  healthInsuranceSalaryBracket: "健保投保級距",
  laborInsuranceSalaryBracket: "勞保投保級距",
  employmentInsuranceSalaryBracket: "就業保險級距",
  occupationalInjuryInsuranceSalaryBracket: "職災保險級距",
  laborPensionSalaryBracket: "勞退級距",
  occupationalInjuryIndustryRate: "職災行業別費率",
  insuredSalary: "投保薪資",

  employerPaidLaborInsurance: "公司負擔勞保費",
  employerPaidHealthInsurance: "公司負擔健保費",
  employerPaidPensionContribution: "公司負擔退休金",
  companyBurdenOccupationalAccidentInsurance: "公司負擔職保費",
  totalSalary: "本月薪資",
  totalEmployerCost: "公司總負擔",

  reported: "扣繳憑單金額",
  paid: "實際發放金額",
} as const;

/**
 * Info: (20260902 - Julian) 區塊標題不得與其內任一列的欄位名相同。
 *
 * 初版寫成「月薪資合計」與「投保薪資」—— 兩者都恰好是該區塊裡某一列的名字。
 * 印在紙上的結果是同一個詞出現兩次而值不同（一個是區塊名、一個是那一列的數字），
 * 讀的人無從分辨哪個才是總計——畫面上有顏色與框線分隔，紙上沒有。
 * 命名沿用 `ISalaryCalculatorUI` 四個欄位自己的註解。
 */
const SECTION_TITLES = {
  monthly: "月薪資項目",
  employee: "員工負擔項目",
  insured: "投保級距與費率",
  employer: "雇主負擔項目",
} as const;

export interface IPaySlipHtmlInput {
  employeeName: string;
  employeeNumber: string;
  year: number;
  month: number;
  result: ISalaryCalculatorUI;
}

/**
 * Info: (20260902 - Julian) 使用者輸入直接插進 HTML 等於把版面交給對方擺佈。
 *
 * 員工姓名與編號都是使用者打進來的。這裡處理的五個字元與
 * `team_invitation.service.ts` 的 `escapeHtml` 相同，理由也相同：
 * 信件／文件的內容全由本檔產生，不需要一套通用的消毒器。
 *
 * **金額不走這裡** —— 它們是 `number`，經過 `numberWithCommas` 之後
 * 只剩數字、逗號與小數點。
 */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Info: (20260902 - Julian) 職災行業別費率是**比率**不是金額。
 *
 * 其餘 32 欄都是元，走 `numberWithCommas`；這一欄是 0.002 這種小數，
 * 加上千分位之後會變成「0」（`formatDynamic` 預設兩位小數）——
 * 一份寫著「職災行業別費率 0」的薪資單看起來完全正常，而它是錯的。
 */
const formatRate = (value: number): string => `${(value * 100).toFixed(3)}%`;

const formatAmount = (value: number): string => numberWithCommas(value);

const renderRows = (rows: { label: string; value: string }[]): string =>
  rows
    .map(
      (row) => `
        <tr>
          <td class="label">${row.label}</td>
          <td class="value">${row.value}</td>
        </tr>`,
    )
    .join("");

const renderSection = (
  title: string,
  accent: string,
  rows: { label: string; value: string }[],
): string => `
  <table class="section" style="border-top:3px solid ${accent}">
    <thead>
      <tr><th colspan="2" class="section-title">${title}</th></tr>
    </thead>
    <tbody>${renderRows(rows)}</tbody>
  </table>`;

export const buildPaySlipHtml = (input: IPaySlipHtmlInput): string => {
  const {
    monthlySalary,
    employeeContribution,
    insuredSalary,
    employerContribution,
  } = input.result;

  const monthlyRows = [
    {
      label: LABELS.baseSalaryWithTax,
      value: formatAmount(monthlySalary.baseSalaryWithTax),
    },
    {
      label: LABELS.overtimePayWithTax,
      value: formatAmount(monthlySalary.overtimePayWithTax),
    },
    {
      label: LABELS.otherAllowanceWithTax,
      value: formatAmount(monthlySalary.otherAllowanceWithTax),
    },
    {
      label: LABELS.totalSalaryWithTax,
      value: formatAmount(monthlySalary.totalSalaryWithTax),
    },
    {
      label: LABELS.mealAllowanceWithoutTax,
      value: formatAmount(monthlySalary.mealAllowanceWithoutTax),
    },
    {
      label: LABELS.overtimePayWithoutTax,
      value: formatAmount(monthlySalary.overtimePayWithoutTax),
    },
    {
      label: LABELS.otherAllowanceWithoutTax,
      value: formatAmount(monthlySalary.otherAllowanceWithoutTax),
    },
    {
      label: LABELS.leaveSalaryWithoutTax,
      value: formatAmount(monthlySalary.leaveSalaryWithoutTax),
    },
    {
      label: LABELS.totalSalaryWithoutTax,
      value: formatAmount(monthlySalary.totalSalaryWithoutTax),
    },
    {
      label: LABELS.totalMonthlySalary,
      value: formatAmount(monthlySalary.totalMonthlySalary),
    },
  ];

  const employeeRows = [
    {
      label: LABELS.employeePaidLaborInsurance,
      value: formatAmount(employeeContribution.employeePaidLaborInsurance),
    },
    {
      label: LABELS.employeePaidHealthInsurance,
      value: formatAmount(employeeContribution.employeePaidHealthInsurance),
    },
    {
      label: LABELS.voluntaryPensionContribution,
      value: formatAmount(employeeContribution.voluntaryPensionContribution),
    },
    {
      label: LABELS.withheldIncomeTax,
      value: formatAmount(employeeContribution.withheldIncomeTax),
    },
    {
      label: LABELS.withheldSecondGenerationNHIPremium,
      value: formatAmount(
        employeeContribution.withheldSecondGenerationNHIPremium,
      ),
    },
    {
      label: LABELS.leaveDeductionTaxable,
      value: formatAmount(employeeContribution.leaveDeductionTaxable),
    },
    {
      label: LABELS.leaveDeductionTaxFree,
      value: formatAmount(employeeContribution.leaveDeductionTaxFree),
    },
    {
      label: LABELS.otherDeductionsOrAdjustments,
      value: formatAmount(employeeContribution.otherDeductionsOrAdjustments),
    },
    {
      label: LABELS.totalEmployeeBurden,
      value: formatAmount(employeeContribution.totalEmployeeBurden),
    },
  ];

  const insuredRows = [
    {
      label: LABELS.healthInsuranceSalaryBracket,
      value: formatAmount(insuredSalary.healthInsuranceSalaryBracket),
    },
    {
      label: LABELS.laborInsuranceSalaryBracket,
      value: formatAmount(insuredSalary.laborInsuranceSalaryBracket),
    },
    {
      label: LABELS.employmentInsuranceSalaryBracket,
      value: formatAmount(insuredSalary.employmentInsuranceSalaryBracket),
    },
    {
      label: LABELS.occupationalInjuryInsuranceSalaryBracket,
      value: formatAmount(
        insuredSalary.occupationalInjuryInsuranceSalaryBracket,
      ),
    },
    {
      label: LABELS.laborPensionSalaryBracket,
      value: formatAmount(insuredSalary.laborPensionSalaryBracket),
    },
    // Info: (20260902 - Julian) 唯一的比率欄，見 formatRate
    {
      label: LABELS.occupationalInjuryIndustryRate,
      value: formatRate(insuredSalary.occupationalInjuryIndustryRate),
    },
    {
      label: LABELS.insuredSalary,
      value: formatAmount(insuredSalary.insuredSalary),
    },
  ];

  const employerRows = [
    {
      label: LABELS.employerPaidLaborInsurance,
      value: formatAmount(employerContribution.employerPaidLaborInsurance),
    },
    {
      label: LABELS.employerPaidHealthInsurance,
      value: formatAmount(employerContribution.employerPaidHealthInsurance),
    },
    {
      label: LABELS.employerPaidPensionContribution,
      value: formatAmount(employerContribution.employerPaidPensionContribution),
    },
    {
      label: LABELS.companyBurdenOccupationalAccidentInsurance,
      value: formatAmount(
        employerContribution.companyBurdenOccupationalAccidentInsurance,
      ),
    },
    {
      label: LABELS.totalSalary,
      value: formatAmount(employerContribution.totalSalary),
    },
    {
      label: LABELS.totalEmployerCost,
      value: formatAmount(employerContribution.totalEmployerCost),
    },
  ];

  const period = `${input.year} 年 ${input.month} 月`;

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.employeeName)} ${period} 薪資單</title>
<style>
  /* Info: (20260902 - Julian) 字型堆疊與其他列印路徑共用同一份常數 —— 缺 CJK 時由 pdf_font_guard 擋下 */
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ${PDF_FONT_STACK};
    color: #1f2937;
    font-size: 11pt;
    line-height: 1.5;
  }
  .sheet { padding: 0; }
  .header { border-bottom: 2px solid #ea580c; padding-bottom: 10px; margin-bottom: 16px; }
  .period { color: #ea580c; font-size: 10pt; font-weight: 600; margin: 0 0 4px; }
  .name { font-size: 20pt; font-weight: 700; margin: 0; }
  .number { color: #6b7280; font-size: 9pt; margin: 2px 0 0; }
  .totals { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .totals td { padding: 4px 0; }
  .totals .k { color: #6b7280; font-size: 9pt; }
  .totals .v { text-align: right; font-size: 15pt; font-weight: 700; color: #c2410c; }
  .totals .unit { font-size: 9pt; color: #9ca3af; font-weight: 600; }
  /* Info: (20260902 - Julian) 兩欄並排用 table 而不是 flex/grid：見檔頭「為什麼用 table」 */
  .grid { width: 100%; border-collapse: separate; border-spacing: 10px 0; table-layout: fixed; }
  .grid > tbody > tr > td { vertical-align: top; width: 50%; }
  .section { width: 100%; border-collapse: collapse; margin-bottom: 12px; background: #f9fafb; }
  .section-title { text-align: left; font-size: 10pt; font-weight: 700; padding: 8px 10px; background: #f3f4f6; }
  .section td { padding: 5px 10px; font-size: 10pt; border-top: 1px solid #e5e7eb; }
  .section td.label { color: #4b5563; }
  .section td.value { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .foot { margin-top: 14px; color: #9ca3af; font-size: 8pt; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p class="period">${period}</p>
      <p class="name">${escapeHtml(input.employeeName)}</p>
      <p class="number">${escapeHtml(input.employeeNumber)}</p>
      <table class="totals">
        <tbody>
          <tr>
            <td class="k">${LABELS.reported}</td>
            <td class="v">${formatAmount(input.result.totalSalaryTaxable)} <span class="unit">NTD</span></td>
          </tr>
          <tr>
            <td class="k">${LABELS.paid}</td>
            <td class="v">${formatAmount(input.result.totalPayment)} <span class="unit">NTD</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <table class="grid">
      <tbody>
        <tr>
          <td>${renderSection(SECTION_TITLES.monthly, "#fb923c", monthlyRows)}</td>
          <td>${renderSection(SECTION_TITLES.employee, "#fb7185", employeeRows)}</td>
        </tr>
        <tr>
          <td>${renderSection(SECTION_TITLES.insured, "#38bdf8", insuredRows)}</td>
          <td>${renderSection(SECTION_TITLES.employer, "#34d399", employerRows)}</td>
        </tr>
      </tbody>
    </table>

    <p class="foot">本薪資單由 iSunFA 產生，金額單位為新臺幣元。</p>
  </div>
</body>
</html>`;
};
