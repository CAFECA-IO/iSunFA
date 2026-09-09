"use client";

import { FC, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
// import Image from 'next/image';
import { useTranslation } from "@/i18n/i18n_context";
import ResultBlock from "@/components/salary_calculator/result_block";
import MaskedAmount from "@/components/salary_calculator/masked_amount";
import {
  formatPaySlipDate,
  PAY_SLIP_INSURED_FIELDS,
  type IPaySlipMeta,
  type PaySlipInsuredField,
} from "@/lib/utils/pay_slip_meta";
import { numberWithCommas } from "@/lib/utils/common";
import { ISalaryCalculatorUI, RowItem } from "@/interfaces/salary_calculator";

interface IPaySlipProps {
  employeeName: string;
  employeeNumber: string;
  selectedMonth: string;
  selectedYear: string;
  resultData: ISalaryCalculatorUI;
  className?: string;
  // Info: (20260901 - Julian) 決定薪資單有沒有卡片外框
  variant?: "card" | "plain";
  /**
   * Info: (20260909 - Julian) 這張薪資單要不要能遮住數值。**預設不能。**
   *
   * 遮罩是給「別人的薪資單」用的 —— 也就是薪資紀錄檢視
   * （`view_pay_slip_modal`）。在辦公室裡幫別人算薪水的人一天會打開好幾個人的
   * 紀錄，每一次打開都是一次曝光，而他不會每一次都記得在有人走過來之前按下那顆鈕。
   *
   * **計算機那一頁不遮**：那裡的數字是使用者自己在同一個畫面上方剛剛輸入的，
   * 遮下面那份等於遮他自己的輸入 —— 而輸入欄位就在旁邊，什麼也沒擋到，
   * 只是讓他每次算完都要多按一下才看得到結果。
   *
   * 預設 `false` 而不是 `true`：新的呼叫端如果忘了想這件事，
   * 得到的是「沒有遮罩」這個看得見的結果，而不是「遮了但不該遮」那個
   * 要按一下才發現的結果。
   */
  maskable?: boolean;
  /**
   * Info: (20260909 - Julian) 到職日與投保狀態。**不給就整個不顯示。**
   *
   * 可選是因為「我的薪資單」那條路徑手上只有計算結果，沒有員工檔 ——
   * 給它一個永遠寫著「到職日：-」的欄位，比沒有這個欄位更糟。
   *
   * 代價是「呼叫端忘了傳」不會有任何症狀。守法是
   * `salary_pay_slip_meta.test.ts` 釘住兩個真正該有的呼叫端
   * （薪資紀錄檢視與計算機）都傳了。
   */
  meta?: IPaySlipMeta;
}

/**
 * Info: (20260909 - Julian) 三種投保的文案，沿用計算機表單上的同一組 key。
 *
 * 另外開一組 `calculator.result.*` 的話，同一件事在畫面上會有兩種說法 ——
 * 而使用者是先在計算機勾了「勞保」，再到薪資單上看它。
 *
 * 型別是 `Record<PaySlipInsuredField, string>`：日後多一種保險，
 * 這裡少一個鍵就編譯失敗。
 */
const INSURED_LABEL_KEY: Record<PaySlipInsuredField, string> = {
  isLaborInsured: "calculator.others_form.option_labor_insurance",
  isHealthInsured: "calculator.others_form.option_nhi",
  isPensionInsured: "calculator.others_form.option_labor_pension",
};

const PaySlip: FC<IPaySlipProps> = ({
  employeeName,
  employeeNumber,
  selectedMonth,
  selectedYear,
  resultData,
  className = "",
  variant = "card",
  maskable = false,
  meta = undefined,
}) => {
  const { t } = useTranslation();

  /**
   * Info: (20260907 - Julian) 遮住薪資單上的數值。**預設遮住**（商業決策）。
   *
   * 兩種預設值的失敗方向不對稱：預設看得見的失敗是「別人的薪資被第三人看到」
   * （不可回復）；預設遮住的失敗是「使用者以為算壞了」
   * （按一下就解決，而且只困惑一次）。完整取捨見
   * `salary_pay_slip_delivery_plan.md` §7。
   *
   * 但下載與寄送不受影響：`pay_slip_download.ts` 會在截圖期間把根元素上的標記
   * 拔掉，而寄出的 PDF 由伺服器另外產生、根本不經過這裡。
   */
  const [isHidden, setIsHidden] = useState<boolean>(true);

  /**
   * Info: (20260909 - Julian) 真正生效的遮罩狀態 —— `maskable` 是總開關。
   *
   * 分成兩個而不是把 `maskable` 直接當成初始值：後者會讓計算機那一頁
   * 多出一顆能按、按了也真的會遮的鈕，而那一頁根本不需要遮
   * （見 `maskable` 的註解）。這裡是「這張單子不支援遮罩」，不是「預設沒遮」。
   */
  const isMasked = maskable && isHidden;

  const showingName = employeeName !== "" ? employeeName : "-";
  const showingNumber = employeeNumber !== "" ? employeeNumber : "-";
  // Info: (20250709 - Julian) 格式化日期
  const formattedMonth =
    selectedMonth.length > 3 ? `${selectedMonth.slice(0, 3)}.` : selectedMonth;
  const formattedDate = `${formattedMonth} ${selectedYear}`;

  const {
    monthlySalary: {
      baseSalaryWithTax, // Info: (20250722 - Julian) 本薪（應稅）
      overtimePayWithTax, // Info: (20250722 - Julian) 加班費（應稅）
      otherAllowanceWithTax, // Info: (20250722 - Julian) 其他加給（應稅）
      totalSalaryWithTax, // Info: (20250722 - Julian) 總應稅薪資
      mealAllowanceWithoutTax, // Info: (20250710 - Julian) 伙食費（免稅）
      overtimePayWithoutTax, // Info: (20250710 - Julian) 加班費（免稅）
      otherAllowanceWithoutTax, // Info: (20250710 - Julian) 其他津貼（免稅）
      leaveSalaryWithoutTax, // Info: (20250825 - Julian) 休假折抵薪資（免稅）
      totalSalaryWithoutTax, // Info: (20250710 - Julian) 總免稅薪資
      totalMonthlySalary, // Info: (20250710 - Julian) 月薪資合計
    },
    employeeContribution: {
      employeePaidLaborInsurance, // Info: (20250710 - Julian) 自行負擔勞保費
      employeePaidHealthInsurance, // Info: (20250710 - Julian) 自行負擔健保費
      voluntaryPensionContribution, // Info: (20250710 - Julian) 自提勞退
      withheldIncomeTax, // Info: (20250710 - Julian) 代扣所得稅款
      withheldSecondGenerationNHIPremium, // Info: (20250710 - Julian) 代扣二代健保
      leaveDeductionTaxable, // Info: (20251113 - Julian) 請假扣薪（應稅）
      leaveDeductionTaxFree, // Info: (20251113 - Julian) 請假扣薪(免稅)
      otherDeductionsOrAdjustments, // Info: (20250825 - Julian) 其他溢扣/ 補收
      totalEmployeeBurden, // Info: (20250819 - Julian) 扣項總計
    },
    insuredSalary: {
      healthInsuranceSalaryBracket, // Info: (20250710 - Julian) 健保投保級距
      laborInsuranceSalaryBracket, // Info: (20250710 - Julian) 勞保投保級距
      employmentInsuranceSalaryBracket, // Info: (20250710 - Julian) 就業保險級距
      occupationalInjuryInsuranceSalaryBracket, // Info: (20250710 - Julian) 職災保險級距
      laborPensionSalaryBracket, // Info: (20250710 - Julian) 勞退級距
      occupationalInjuryIndustryRate, // Info: (20250710 - Julian) 職災行業別費率
      insuredSalary, // Info: (20250710 - Julian) 投保薪資
    },
    employerContribution: {
      employerPaidLaborInsurance, // Info: (20250710 - Julian) 公司負擔勞保費
      employerPaidHealthInsurance, // Info: (20250710 - Julian) 公司負擔健保費
      employerPaidPensionContribution, // Info: (20250710 - Julian) 公司負擔退休金
      companyBurdenOccupationalAccidentInsurance, // Info: (20251003 - Julian) 公司負擔職保費
      totalSalary, // Info: (20251113 - Julian) 本月薪資
      totalEmployerCost, // Info: (20250710 - Julian) 雇主總負擔
    },
    totalPayment, // Info: (20250710 - Julian) 實際發放金額
    totalSalaryTaxable, // Info: (20250825 - Julian) 扣繳憑單金額
  } = resultData;

  // Info: (20250708 - Julian) 月薪資項目
  const monthlyRowItems: RowItem[] = [
    {
      label: t("calculator.result.base_salary_with_tax"),
      value: baseSalaryWithTax,
    },
    {
      label: t("calculator.result.overtime_pay_with_tax"),
      value: overtimePayWithTax,
    },
    {
      label: t("calculator.result.other_allowance_with_tax"),
      value: otherAllowanceWithTax,
    },
    {
      label: t("calculator.result.total_salary_with_tax"),
      value: totalSalaryWithTax,
    },
    {
      label: t("calculator.result.meal_allowance_without_tax"),
      value: mealAllowanceWithoutTax,
    },
    {
      label: t("calculator.result.overtime_pay_without_tax"),
      value: overtimePayWithoutTax,
    },
    {
      label: t("calculator.result.other_allowance_without_tax"),
      value: otherAllowanceWithoutTax,
    },
    {
      label: t("calculator.result.leave_salary_without_tax"),
      value: leaveSalaryWithoutTax,
    },
    {
      label: t("calculator.result.total_salary_without_tax"),
      value: totalSalaryWithoutTax,
    },
    {
      label: t("calculator.result.total_monthly_salary"),
      value: totalMonthlySalary,
    },
  ];

  // Info: (20250708 - Julian) 員工負擔項目
  const employeeRowItems: RowItem[] = [
    {
      label: t("calculator.result.employee_paid_labor_insurance"),
      value: employeePaidLaborInsurance,
    },
    {
      label: t("calculator.result.employee_paid_health_insurance"),
      value: employeePaidHealthInsurance,
    },
    {
      label: t("calculator.result.voluntary_pension_contribution"),
      value: voluntaryPensionContribution,
    },
    {
      label: t("calculator.result.withheld_income_tax"),
      value: withheldIncomeTax,
    },
    {
      label: t("calculator.result.withheld_second_generation_nhi_premium"),
      value: withheldSecondGenerationNHIPremium,
    },
    {
      label: t("calculator.result.leave_deduction_with_tax"),
      value: leaveDeductionTaxable,
    },
    {
      label: t("calculator.result.leave_deduction_without_tax"),
      value: leaveDeductionTaxFree,
    },
    {
      label: t("calculator.result.other_deductions_adjustments"),
      value: otherDeductionsOrAdjustments,
    },
    {
      label: t("calculator.result.total_deductions"),
      value: totalEmployeeBurden,
    },
  ];

  // Info: (20250708 - Julian) 投保級距項目
  const insuredSalaryRowItems: RowItem[] = [
    {
      label: t("calculator.result.health_insurance_salary_bracket"),
      value: healthInsuranceSalaryBracket,
    },
    {
      label: t("calculator.result.labor_insurance_salary_bracket"),
      value: laborInsuranceSalaryBracket,
    },
    {
      label: t("calculator.result.employment_insurance_salary_bracket"),
      value: employmentInsuranceSalaryBracket,
    },
    {
      label: t(
        "calculator.result.occupational_injury_insurance_salary_bracket",
      ),
      value: occupationalInjuryInsuranceSalaryBracket,
    },
    {
      label: t("calculator.result.labor_pension_salary_bracket"),
      value: laborPensionSalaryBracket,
    },
    {
      label: t("calculator.result.occupational_injury_industry_rate"),
      value: occupationalInjuryIndustryRate,
    },
    {
      label: t("calculator.result.insured_salary"),
      value: insuredSalary,
    },
  ];

  // Info: (20250708 - Julian) 雇主負擔項目
  const employerRowItems: RowItem[] = [
    {
      label: t("calculator.result.employer_paid_labor_insurance"),
      value: employerPaidLaborInsurance,
    },
    {
      label: t("calculator.result.employer_paid_health_insurance"),
      value: employerPaidHealthInsurance,
    },
    {
      label: t("calculator.result.employer_paid_pension_contribution"),
      value: employerPaidPensionContribution,
    },
    {
      label: t(
        "calculator.result.company_burden_occupational_accident_insurance",
      ),
      value: companyBurdenOccupationalAccidentInsurance,
    },
    {
      label: t("calculator.result.monthly_pay"),
      value: totalSalary,
    },
    {
      label: t("calculator.result.total_employer_cost"),
      value: totalEmployerCost,
    },
  ];

  /**
   * Info: (20260909 - Julian) 投保狀態排在級距**前面**（`statusItems` 就是那個位置）。
   *
   * 未投保時級距是 0，而「勞保投保級距 0」讀起來像資料漏了，
   * 不像「這個人沒有投保」。先講狀態，下面那幾個 0 才有解釋。
   *
   * 走 `PAY_SLIP_INSURED_FIELDS` 而不是自己列三行：寄出的
   * `pay_slip_html.ts` 也 map 同一份清單 —— 日後多一種保險，
   * 不可能只落在畫面或只落在信件其中一邊。
   */
  const insuredStatusItems = meta
    ? PAY_SLIP_INSURED_FIELDS.map((field) => ({
        label: t(INSURED_LABEL_KEY[field]),
        value: meta[field]
          ? t("calculator.result.insured_yes")
          : t("calculator.result.insured_no"),
      }))
    : [];

  return (
    <div
      id="payslip-download"
      // Info: (20260907 - Julian) 只在遮住時出現 —— 截圖前由 downloadNodeAsPng 拔掉
      data-values-hidden={isMasked ? "true" : undefined}
      className={`relative flex flex-col gap-6 bg-white ${
        variant === "card"
          ? "overflow-hidden rounded-2xl border border-gray-200 p-6 shadow-xl"
          : ""
      } ${className}`}
    >
      <div className="absolute top-0 left-0 h-1 w-full" />
      {/* Info: (20250708 - Julian) Title */}
      <div className="grid grid-cols-1 gap-3 text-gray-900 lg:grid-cols-2">
        {/* Info: (20250708 - Julian) 姓名和日期 */}
        <div className="flex flex-col items-start gap-2">
          <p className="text-text-brand-primary-lv1 text-xs font-medium lg:text-base lg:font-semibold">
            {formattedDate}
          </p>
          <div className="text-text-neutral-primary flex items-baseline gap-2 text-2xl font-bold lg:text-[28px]">
            {showingName}
            <span className="block text-xs font-medium lg:hidden">
              {showingNumber}
            </span>
          </div>
          <p className="text-text-neutral-primary hidden text-xs font-medium lg:block">
            {showingNumber}
          </p>
          {/**
           * Info: (20260909 - Julian) 到職日放在身分那一區，不在投保區塊。
           *
           * 它回答的是「這個人是誰」而不是「這個月怎麼算的」——
           * 勞檢對照投保申報表時看的也是這一區。
           *
           * 沒有 `hidden lg:block`：編號在手機版被搬到姓名旁邊，
           * 而到職日沒有那個並排的位置，兩種尺寸都留在這裡。
           */}
          {meta && (
            <p className="text-text-neutral-tertiary text-xs font-medium">
              {t("calculator.result.hire_date")}:{" "}
              {formatPaySlipDate(meta.hireDate)}
            </p>
          )}
        </div>
        {/* Info: (20250708 - Julian) 薪資合計 */}
        {/* <div className="flex items-end justify-end gap-[8px] text-[28px] font-bold text-text-brand-primary-lv2">
          <Image src="/icons/money_bag.svg" alt="salary_icon" width={32} height={32} />
          <p>NT ${numberWithCommas(totalSalary)}</p>
        </div> */}
        <div className="flex flex-col gap-2">
          {/**
           * Info: (20260907 - Julian) 切換鈕放在兩個大數字的上面、靠右。
           *
           * 那兩個是整張薪資單最先被看到的東西，按鈕在它們正上方，
           * 手要遮的時候不必找。不用絕對定位：`variant="plain"` 的呼叫端
           * 自己加外距（`view_pay_slip_modal` 給的是 `px-[40px] py-[24px]`），
           * 絕對定位會貼到那層外距之外。
           *
           * `data-capture-exclude` 讓它不會出現在下載的 PNG 裡 ——
           * 那張圖是要給員工看的，上面不該有一顆操作鈕。
           *
           * Info: (20260909 - Julian) 不支援遮罩的呼叫端（計算機）整顆不 render。
           * 留一顆按了沒有效果的鈕，比沒有這顆鈕更糟 —— 使用者會以為遮罩壞了。
           */}
          {maskable && (
            <div className="flex justify-end">
              <button
                type="button"
                data-capture-exclude="true"
                onClick={() => setIsHidden((prev) => !prev)}
                aria-pressed={isHidden}
                className="text-text-neutral-tertiary hover:text-text-neutral-primary flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-gray-100"
              >
                {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                {isHidden
                  ? t("calculator.result.show_values")
                  : t("calculator.result.hide_values")}
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase">
              {t("calculator.result.reported")}
            </p>
            <div className="text-text-brand-primary-lv2 text-2xl font-bold">
              <MaskedAmount value={numberWithCommas(totalSalaryTaxable)} />{" "}
              <span className="text-text-neutral-tertiary text-base font-semibold">
                NTD
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase">
              {t("calculator.result.paid")}
            </p>
            <div className="text-text-brand-primary-lv2 text-2xl font-bold">
              <MaskedAmount value={numberWithCommas(totalPayment)} />{" "}
              <span className="text-text-neutral-tertiary text-base font-semibold">
                NTD
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Info: (20250708 - Julian) Result Field */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Info: (20250708 - Julian) 月薪資合計 */}
        <ResultBlock
          backgroundColor="bg-orange-100"
          rowItems={monthlyRowItems}
        />
        {/* Info: (20250708 - Julian) 員工負擔 */}
        <ResultBlock
          backgroundColor="bg-rose-100"
          rowItems={employeeRowItems}
        />
        {/* Info: (20250708 - Julian) 投保薪資 */}
        <ResultBlock
          backgroundColor="bg-sky-100"
          rowItems={insuredSalaryRowItems}
          statusItems={insuredStatusItems}
        />
        {/* Info: (20250708 - Julian) 雇主總負擔 */}
        <ResultBlock
          backgroundColor="bg-emerald-100"
          rowItems={employerRowItems}
        />
      </div>
    </div>
  );
};

export default PaySlip;
