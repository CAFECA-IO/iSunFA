import React from "react";
// import Image from 'next/image';
import { useTranslation } from "@/i18n/i18n_context";
import ResultBlock from "@/components/salary_calculator/result_block";
import { numberWithCommas } from "@/lib/utils/common";
import { ISalaryCalculatorUI, RowItem } from "@/interfaces/salary_calculator";

interface IPaySlipProps {
  employeeName: string;
  employeeNumber: string;
  selectedMonth: string;
  selectedYear: string;
  resultData: ISalaryCalculatorUI;
  className?: string;
}

const PaySlip: React.FC<IPaySlipProps> = ({
  employeeName,
  employeeNumber,
  selectedMonth,
  selectedYear,
  resultData,
  className = "",
}) => {
  const { t } = useTranslation();

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

  return (
    <div
      id="payslip-download"
      className={`relative flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-xl border border-gray-200 overflow-hidden ${className}`}
    >
      <div className="absolute top-0 left-0 w-full h-1" />
      {/* Info: (20250708 - Julian) Title */}
      <div className="grid grid-cols-1 gap-3 text-gray-900 lg:grid-cols-2">
        {/* Info: (20250708 - Julian) 姓名和日期 */}
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs font-medium text-text-brand-primary-lv1 lg:text-base lg:font-semibold">
            {formattedDate}
          </p>
          <div className="flex items-baseline gap-2 text-2xl font-bold text-text-neutral-primary lg:text-[28px]">
            {showingName}
            <span className="block text-xs font-medium lg:hidden">
              {showingNumber}
            </span>
          </div>
          <p className="hidden text-xs font-medium text-text-neutral-primary lg:block">
            {showingNumber}
          </p>
        </div>
        {/* Info: (20250708 - Julian) 薪資合計 */}
        {/* <div className="flex items-end justify-end gap-8px text-28px font-bold text-text-brand-primary-lv2">
          <Image src="/icons/money_bag.svg" alt="salary_icon" width={32} height={32} />
          <p>NT ${numberWithCommas(totalSalary)}</p>
        </div> */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase ">
              {t("calculator.result.reported")}
            </p>
            <div className="text-2xl font-bold text-text-brand-primary-lv2">
              {numberWithCommas(totalSalaryTaxable)}{" "}
              <span className="text-base font-semibold text-text-neutral-tertiary">
                NTD
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase ">
              {t("calculator.result.paid")}
            </p>
            <div className="text-2xl font-bold text-text-brand-primary-lv2">
              {numberWithCommas(totalPayment)}{" "}
              <span className="text-base font-semibold text-text-neutral-tertiary">
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
