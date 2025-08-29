import React, { useState } from 'react';
import Image from 'next/image';
import SalaryResultSection from '@/components/salary_calculator/salary_result_section';
import SalaryFormSection from '@/components/salary_calculator/salary_form_section';
import CalculatorNavbar from '@/components/salary_calculator/calculator_navbar';

enum CalcTab {
  CALCULATOR = 'calculator',
  PAY_SLIP = 'paySlip',
}

const SalaryCalculatorPageBody: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<CalcTab>(CalcTab.CALCULATOR);

  const isCalculatorTab = currentTab === CalcTab.CALCULATOR;
  const isPaySlipTab = currentTab === CalcTab.PAY_SLIP;

  const calculatorClickHandler = () => setCurrentTab(CalcTab.CALCULATOR);
  const paySlipClickHandler = () => setCurrentTab(CalcTab.PAY_SLIP);

  return (
    <main className="min-h-screen overflow-x-hidden bg-surface-neutral-main-background">
      {/* Info: (20250708 - Julian) Header */}
      <CalculatorNavbar />

      {/* Info: (20250887 - Julian) Main Content Desktop */}
      <div className="hidden gap-84px overflow-x-auto p-80px tablet:flex">
        {/* Info: (20250708 - Julian) Form Part */}
        <SalaryFormSection />
        {/* Info: (20250708 - Julian) Result Part */}
        <SalaryResultSection />
      </div>

      {/* Info: (20250887 - Julian) Main Content Mobile */}
      <div className="flex flex-col gap-lv-7 px-lv-5 py-lv-7 tablet:hidden">
        <div className="grid grid-cols-2 gap-lv-4">
          <button
            type="button"
            onClick={calculatorClickHandler}
            className={`${isCalculatorTab ? 'border-tabs-stroke-active text-tabs-text-active' : 'border-tabs-stroke-default text-tabs-text-default'} flex items-center justify-center gap-8px border-b-2 px-12px py-8px text-base font-medium hover:border-tabs-stroke-active hover:text-tabs-text-active`}
          >
            <Image src="/icons/calculator_tab.svg" alt="calculator_icon" width={24} height={24} />
            <p>Calculator</p>
          </button>
          <button
            type="button"
            onClick={paySlipClickHandler}
            className={`${isPaySlipTab ? 'border-tabs-stroke-active text-tabs-text-active' : 'border-tabs-stroke-default text-tabs-text-default'} flex items-center justify-center gap-8px border-b-2 px-12px py-8px text-base font-medium hover:border-tabs-stroke-active hover:text-tabs-text-active`}
          >
            <Image src="/icons/pay_slip_tab.svg" alt="pay_slip_icon" width={24} height={24} />
            <p>Pay Slip</p>
          </button>
        </div>
        {/* Info: (20250828 - Julian) Form Part */}
        {isCalculatorTab && <SalaryFormSection />}
      </div>
    </main>
  );
};

export default SalaryCalculatorPageBody;
