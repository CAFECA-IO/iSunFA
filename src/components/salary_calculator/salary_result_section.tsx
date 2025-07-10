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
  // ToDo: (20250708 - Julian) during development
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useTranslation('common');
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
    { label: '本薪（應稅）', value: baseSalary },
    {
      label: '伙食費（免稅）',
      value: mealAllowance,
    },
    {
      label: '加班費（免稅）',
      value: overtimePay,
    },
    {
      label: '其他津貼（免稅）',
      value: otherAllowance,
    },
    {
      label: '月薪資合計',
      value: totalMonthlySalary,
    },
  ];

  // Info: (20250708 - Julian) 員工負擔項目
  const employeeRowItems: RowItem[] = [
    {
      label: '自行負擔勞保費',
      value: employeePaidLaborInsurance,
    },
    {
      label: '自行負擔健保費',
      value: employeePaidHealthInsurance,
    },
    {
      label: '自提勞退',
      value: voluntaryPensionContribution,
    },
    {
      label: '代扣所得稅款',
      value: withheldIncomeTax,
    },
    {
      label: '代扣二代健保',
      value: withheldSecondGenerationNHIPremium,
    },
    {
      label: '請假扣薪',
      value: salaryDeductionForLeave,
    },
    {
      label: '員工負擔總計',
      value: totalEmployeeContribution,
    },
  ];

  // Info: (20250708 - Julian) 投保級距項目
  const insuredSalaryRowItems: RowItem[] = [
    {
      label: '健保投保級距',
      value: healthInsuranceSalaryBracket,
    },
    {
      label: '勞保投保級距',
      value: laborInsuranceSalaryBracket,
    },
    {
      label: '就業保險級距',
      value: employmentInsuranceSalaryBracket,
    },
    {
      label: '職災保險級距',
      value: occupationalInjuryInsuranceSalaryBracket,
    },
    {
      label: '勞退級距',
      value: laborPensionSalaryBracket,
    },
    {
      label: '職災行業別費率',
      value: occupationalInjuryIndustryRate,
    },
    {
      label: '投保薪資',
      value: insuredSalary,
    },
  ];

  // Info: (20250708 - Julian) 雇主負擔項目
  const employerRowItems: RowItem[] = [
    {
      label: '公司負擔勞健退',
      value: employerContributions,
    },
    {
      label: '公司負擔勞保費',
      value: employerPaidLaborInsurance,
    },
    {
      label: '公司負擔健保費',
      value: employerPaidHealthInsurance,
    },
    {
      label: '公司負擔退休金',
      value: employerPaidPensionContribution,
    },
    {
      label: '雇主總負擔',
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
          Download as png <TbDownload size={20} />
        </Button>
        <Button type="button" variant="tertiary">
          Send the Pay Slip <FiSend size={20} />
        </Button>
      </div>
    </div>
  );
};

export default SalaryCalculatorResult;
