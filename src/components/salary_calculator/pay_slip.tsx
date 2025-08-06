import React from 'react';
// import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import ResultBlock from '@/components/salary_calculator/result_block';
import { numberWithCommas } from '@/lib/utils/common';
import { ISalaryCalculator, RowItem } from '@/interfaces/calculator';

interface IPaySlipProps {
  employeeName: string;
  employeeNumber: string;
  selectedMonth: string;
  selectedYear: string;
  resultData: ISalaryCalculator;
  className?: string;
}

const PaySlip: React.FC<IPaySlipProps> = ({
  employeeName,
  employeeNumber,
  selectedMonth,
  selectedYear,
  resultData,
  className = '',
}) => {
  const { t } = useTranslation('calculator');

  const showingName = employeeName !== '' ? employeeName : '-';
  const showingNumber = employeeNumber !== '' ? employeeNumber : '-';
  // Info: (20250709 - Julian) 格式化日期
  const formattedMonth = selectedMonth.length > 3 ? `${selectedMonth.slice(0, 3)}.` : selectedMonth;
  const formattedDate = `${formattedMonth} ${selectedYear}`;

  const {
    monthlySalary: {
      baseSalaryWithTax, // Info: (20250722 - Julian) 本薪（應稅）
      overtimePayWithTax, // Info: (20250722 - Julian) 加班費（應稅）
      otherAllowanceWithTax, // Info: (20250722 - Julian) 其他加給（應稅）
      totalSalaryWithTax, // Info: (20250722 - Julian) 總應稅薪資
      mealAllowanceWithoutTax, // Info: (20250710 - Julian) 伙食費（免稅）
      overtimePayWithoutTax, // Info: (20250710 - Julian) 加班費（免稅）
      otherAllowanceWithoutTax, // Info: (20250710 - Julian) 其他加給（免稅）
      totalSalaryWithoutTax, // Info: (20250710 - Julian) 總免稅薪資
      totalMonthlySalary, // Info: (20250710 - Julian) 月薪資合計
    },
    employeeContribution: {
      employeePaidLaborInsurance, // Info: (20250710 - Julian) 自行負擔勞保費
      employeePaidHealthInsurance, // Info: (20250710 - Julian) 自行負擔健保費
      healthInsuranceAdditionalPremium, // Info: (20250806 - Julian) 健保加保費
      voluntaryPensionContribution, // Info: (20250710 - Julian) 自提勞退
      withheldIncomeTax, // Info: (20250710 - Julian) 代扣所得稅款
      withheldSecondGenerationNHIPremium, // Info: (20250710 - Julian) 代扣二代健保
      salaryDeductionForLeave, // Info: (20250710 - Julian) 請假扣薪
      totalEmployeeContribution, // Info: (20250710 - Julian) 員工負擔總計
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
      employerContributions, // Info: (20250710 - Julian) 公司負擔勞健退
      employerPaidLaborInsurance, // Info: (20250710 - Julian) 公司負擔勞保費
      employerPaidHealthInsurance, // Info: (20250710 - Julian) 公司負擔健保費
      employerPaidPensionContribution, // Info: (20250710 - Julian) 公司負擔退休金
      totalEmployerCost, // Info: (20250710 - Julian) 雇主總負擔
    },
    totalSalary, // Info: (20250710 - Julian) 薪資合計
  } = resultData;

  // Info: (20250708 - Julian) 月薪資項目
  const monthlyRowItems: RowItem[] = [
    { label: t('calculator:RESULT.BASE_SALARY_WITH_TAX'), value: baseSalaryWithTax },
    {
      label: t('calculator:RESULT.OVERTIME_PAY_WITH_TAX'),
      value: overtimePayWithTax,
    },
    {
      label: t('calculator:RESULT.OTHER_ALLOWANCE_WITH_TAX'),
      value: otherAllowanceWithTax,
    },
    {
      label: t('calculator:RESULT.TOTAL_SALARY_WITH_TAX'),
      value: totalSalaryWithTax,
    },
    {
      label: t('calculator:RESULT.MEAL_ALLOWANCE_WITHOUT_TAX'),
      value: mealAllowanceWithoutTax,
    },
    {
      label: t('calculator:RESULT.OVERTIME_PAY_WITHOUT_TAX'),
      value: overtimePayWithoutTax,
    },
    {
      label: t('calculator:RESULT.OTHER_ALLOWANCE_WITHOUT_TAX'),
      value: otherAllowanceWithoutTax,
    },
    {
      label: t('calculator:RESULT.TOTAL_SALARY_WITHOUT_TAX'),
      value: totalSalaryWithoutTax,
    },
    {
      label: t('calculator:RESULT.TOTAL_MONTHLY_SALARY'),
      value: totalMonthlySalary,
    },
  ];

  // Info: (20250708 - Julian) 員工負擔項目
  const employeeRowItems: RowItem[] = [
    {
      label: t('calculator:RESULT.EMPLOYEE_PAID_LABOR_INSURANCE'),
      value: employeePaidLaborInsurance,
    },
    {
      label: t('calculator:RESULT.EMPLOYEE_PAID_HEALTH_INSURANCE'),
      value: employeePaidHealthInsurance,
    },
    {
      label: t('calculator:RESULT.HEALTH_INSURANCE_ADDITIONAL_PREMIUM'),
      value: healthInsuranceAdditionalPremium,
    },
    {
      label: t('calculator:RESULT.VOLUNTARY_PENSION_CONTRIBUTION'),
      value: voluntaryPensionContribution,
    },
    {
      label: t('calculator:RESULT.WITHHELD_INCOME_TAX'),
      value: withheldIncomeTax,
    },
    {
      label: t('calculator:RESULT.WITHHELD_SECOND_GENERATION_NHI_PREMIUM'),
      value: withheldSecondGenerationNHIPremium,
    },
    {
      label: t('calculator:RESULT.SALARY_DEDUCTION_FOR_LEAVE'),
      value: salaryDeductionForLeave,
    },
    {
      label: t('calculator:RESULT.TOTAL_EMPLOYEE_CONTRIBUTION'),
      value: totalEmployeeContribution,
    },
  ];

  // Info: (20250708 - Julian) 投保級距項目
  const insuredSalaryRowItems: RowItem[] = [
    {
      label: t('calculator:RESULT.HEALTH_INSURANCE_SALARY_BRACKET'),
      value: healthInsuranceSalaryBracket,
    },
    {
      label: t('calculator:RESULT.LABOR_INSURANCE_SALARY_BRACKET'),
      value: laborInsuranceSalaryBracket,
    },
    {
      label: t('calculator:RESULT.EMPLOYMENT_INSURANCE_SALARY_BRACKET'),
      value: employmentInsuranceSalaryBracket,
    },
    {
      label: t('calculator:RESULT.OCCUPATIONAL_INJURY_INSURANCE_SALARY_BRACKET'),
      value: occupationalInjuryInsuranceSalaryBracket,
    },
    {
      label: t('calculator:RESULT.LABOR_PENSION_SALARY_BRACKET'),
      value: laborPensionSalaryBracket,
    },
    {
      label: t('calculator:RESULT.OCCUPATIONAL_INJURY_INDUSTRY_RATE'),
      value: occupationalInjuryIndustryRate,
    },
    {
      label: t('calculator:RESULT.INSURED_SALARY'),
      value: insuredSalary,
    },
  ];

  // Info: (20250708 - Julian) 雇主負擔項目
  const employerRowItems: RowItem[] = [
    {
      label: t('calculator:RESULT.EMPLOYER_CONTRIBUTIONS'),
      value: employerContributions,
    },
    {
      label: t('calculator:RESULT.EMPLOYER_PAID_LABOR_INSURANCE'),
      value: employerPaidLaborInsurance,
    },
    {
      label: t('calculator:RESULT.EMPLOYER_PAID_HEALTH_INSURANCE'),
      value: employerPaidHealthInsurance,
    },
    {
      label: t('calculator:RESULT.EMPLOYER_PAID_PENSION_CONTRIBUTION'),
      value: employerPaidPensionContribution,
    },
    {
      label: t('calculator:RESULT.TOTAL_EMPLOYER_COST'),
      value: totalEmployerCost,
    },
  ];

  return (
    <div
      id="payslip-download"
      className={`flex flex-col gap-12px bg-surface-neutral-surface-lv2 ${className}`}
    >
      {/* Info: (20250708 - Julian) Title */}
      <div className="grid grid-cols-2 gap-12px">
        {/* Info: (20250708 - Julian) 姓名和日期 */}
        <div className="flex flex-col items-start gap-8px">
          <p className="text-base font-semibold text-text-brand-primary-lv1">{formattedDate}</p>
          <p className="text-28px font-bold text-text-neutral-primary">{showingName}</p>
          <p className="text-xs font-medium text-text-neutral-primary">{showingNumber}</p>
        </div>
        {/* Info: (20250708 - Julian) 薪資合計 */}
        {/* <div className="flex items-end justify-end gap-8px text-28px font-bold text-text-brand-primary-lv2">
          <Image src="/icons/money_bag.svg" alt="salary_icon" width={32} height={32} />
          <p>NT ${numberWithCommas(totalSalary)}</p>
        </div> */}
        <div className="flex flex-col gap-8px">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-black">
              {t('calculator:RESULT.REPORTED')}
            </p>
            <div className="text-2xl font-bold text-text-brand-primary-lv2">
              {numberWithCommas(totalSalary)}{' '}
              <span className="text-base font-semibold text-text-neutral-tertiary">NTD</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-black">
              {t('calculator:RESULT.PAID')}
            </p>
            <div className="text-2xl font-bold text-text-brand-primary-lv2">
              {numberWithCommas(totalSalary)}{' '}
              <span className="text-base font-semibold text-text-neutral-tertiary">NTD</span>
            </div>
          </div>
        </div>
      </div>
      {/* Info: (20250708 - Julian) Result Field */}
      <div className="grid grid-cols-2 gap-12px">
        {/* Info: (20250708 - Julian) 月薪資合計 */}
        <ResultBlock backgroundColor="bg-surface-support-soft-maple" rowItems={monthlyRowItems} />
        {/* Info: (20250708 - Julian) 員工負擔 */}
        <ResultBlock backgroundColor="bg-surface-support-soft-rose" rowItems={employeeRowItems} />
        {/* Info: (20250708 - Julian) 投保薪資 */}
        <ResultBlock
          backgroundColor="bg-surface-support-soft-baby"
          rowItems={insuredSalaryRowItems}
        />
        {/* Info: (20250708 - Julian) 雇主總負擔 */}
        <ResultBlock backgroundColor="bg-surface-support-soft-green" rowItems={employerRowItems} />
      </div>
    </div>
  );
};

export default PaySlip;
