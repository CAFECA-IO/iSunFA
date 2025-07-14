import React, { useRef } from 'react';
import Image from 'next/image';
import { TbDownload } from 'react-icons/tb';
import { FiSend } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { numberWithCommas } from '@/lib/utils/common';
import { Button } from '@/components/button/button';
import ResultBlock from '@/components/salary_calculator/result_block';
import { RowItem } from '@/interfaces/calculator';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import html2canvas from 'html2canvas';

const SalaryCalculatorResult: React.FC = () => {
  const { t } = useTranslation('calculator');
  const downloadRef = useRef<HTMLDivElement>(null);

  const { employeeName, selectedMonth, selectedYear, salaryCalculator } = useCalculatorCtx();

  const username = employeeName !== '' ? employeeName : '-';
  // Info: (20250709 - Julian) 格式化日期
  const formattedDate = `${selectedMonth.name.length > 3 ? `${selectedMonth.name.slice(0, 3)}.` : selectedMonth} ${selectedYear}`;

  // Info: (20250710 - Julian) 下載圖片功能
  const downloadPng = () => {
    if (!downloadRef.current) return;

    html2canvas(downloadRef.current, {
      backgroundColor: null,
      scale: 2,
      onclone: (clonedNode) => {
        // Info: (20250710 - Julian) 調整樣式
        const frame = clonedNode.querySelector<HTMLIFrameElement>('#salary-result');
        if (frame) {
          frame.style.borderRadius = '0px';
        }
      },
    }).then((canvas) => {
      // Info: (20250710 - Julian) 下載圖片
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${employeeName}_${formattedDate}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const {
    monthlySalary: {
      baseSalary,
      mealAllowance,
      overtimePay, // Info: (20250710 - Julian) 加班費
      otherAllowance,
      totalMonthlySalary, // Info: (20250710 - Julian) 月薪資合計
    },
    employeeContribution: {
      employeePaidLaborInsurance, // Info: (20250710 - Julian) 自行負擔勞保費
      employeePaidHealthInsurance, // Info: (20250710 - Julian) 自行負擔健保費
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
  } = salaryCalculator;

  // Info: (20250708 - Julian) 月薪資項目
  const monthlyRowItems: RowItem[] = [
    { label: t('calculator:RESULT.BASE_SALARY'), value: baseSalary },
    {
      label: t('calculator:RESULT.MEAL_ALLOWANCE'),
      value: mealAllowance,
    },
    {
      label: t('calculator:RESULT.OVERTIME_PAY'),
      value: overtimePay,
    },
    {
      label: t('calculator:RESULT.OTHER_ALLOWANCE'),
      value: otherAllowance,
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
    <div className="flex w-full flex-col gap-24px py-80px pl-24px pr-60px">
      {/* Info: (20250708 - Julian) Result Block */}
      <div
        id="salary-result"
        ref={downloadRef}
        className="flex flex-col gap-12px rounded-lg bg-surface-neutral-surface-lv2 p-24px shadow-Dropshadow_XS"
      >
        {/* Info: (20250708 - Julian) Result Title */}
        <div className="grid grid-cols-2 gap-12px">
          {/* Info: (20250708 - Julian) 姓名和日期 */}
          <div className="flex flex-col items-start gap-8px">
            <p className="text-base font-semibold text-text-brand-primary-lv1">{formattedDate}</p>
            <p className="text-28px font-bold text-text-neutral-primary">{username}</p>
          </div>
          {/* Info: (20250708 - Julian) 薪資合計 */}
          <div className="flex items-end justify-end gap-8px text-28px font-bold text-text-brand-primary-lv2">
            <Image src="/icons/money_bag.svg" alt="salary_icon" width={32} height={32} />
            <p>NT ${numberWithCommas(totalSalary)}</p>
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
          <ResultBlock
            backgroundColor="bg-surface-support-soft-green"
            rowItems={employerRowItems}
          />
        </div>
      </div>
      {/* Info: (20250708 - Julian) Buttons */}
      <div className="grid grid-cols-2 gap-24px">
        <Button type="button" variant="tertiary" onClick={downloadPng}>
          {t('calculator:BUTTON.DOWNLOAD')} <TbDownload size={20} />
        </Button>
        <Button type="button" variant="tertiary">
          {t('calculator:BUTTON.SEND')} <FiSend size={20} />
        </Button>
      </div>
    </div>
  );
};

export default SalaryCalculatorResult;
