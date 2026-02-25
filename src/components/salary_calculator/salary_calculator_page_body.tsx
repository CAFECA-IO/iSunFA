"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n/i18n_context";
import SalaryResultSection from "@/components/salary_calculator/salary_result_section";
import SalaryFormSection from "@/components/salary_calculator/salary_form_section";
import CalculatorHeader from "@/components/salary_calculator/calculator_header";
import ProgressBar from "@/components/salary_calculator/progress_bar";

enum CalcTab {
  CALCULATOR = "calculator",
  PAY_SLIP = "paySlip",
}

const SalaryCalculatorPageBody: React.FC = () => {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState<CalcTab>(CalcTab.CALCULATOR);

  const isCalculatorTab = currentTab === CalcTab.CALCULATOR;
  const isPaySlipTab = currentTab === CalcTab.PAY_SLIP;

  const calculatorClickHandler = () => setCurrentTab(CalcTab.CALCULATOR);
  const paySlipClickHandler = () => setCurrentTab(CalcTab.PAY_SLIP);

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Info: (20250708 - Julian) Header */}
      <CalculatorHeader />

      {/* Info: (20250887 - Julian) Main Content Desktop */}
      <div className="hidden gap-[84px] overflow-x-auto p-[80px] tablet:flex">
        {/* Info: (20250708 - Julian) Form Part */}
        <SalaryFormSection />
        {/* Info: (20250708 - Julian) Result Part */}
        <SalaryResultSection />
      </div>

      {/* Info: (20250887 - Julian) Main Content Mobile */}
      <div className="flex flex-col gap-7 px-5 py-7 tablet:hidden">
        {/* Info: (20250828 - Julian) Mobile Tabs */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={calculatorClickHandler}
            className={`${isCalculatorTab ? "border-orange-600 text-orange-900" : "border-gray-200 text-gray-500"} flex items-center justify-center gap-2 border-b-2 px-3 py-2 text-base font-medium hover:border-orange-600 hover:text-orange-900 transition-colors duration-200`}
          >
            <Image
              src="/icons/calculator_tab.svg"
              alt="calculator_icon"
              width={24}
              height={24}
            />
            <p>{t("calculator.tabs.calculator")}</p>
          </button>
          <button
            type="button"
            onClick={paySlipClickHandler}
            className={`${isPaySlipTab ? "border-orange-600 text-orange-900" : "border-gray-200 text-gray-500"} flex items-center justify-center gap-2 border-b-2 px-3 py-2 text-base font-medium hover:border-orange-600 hover:text-orange-900 transition-colors duration-200`}
          >
            <Image
              src="/icons/pay_slip_tab.svg"
              alt="pay_slip_icon"
              width={24}
              height={24}
            />
            <p>{t("calculator.tabs.pay_slip")}</p>
          </button>
        </div>
        {/* Info: (20250828 - Julian) Form Part */}
        {isCalculatorTab && <SalaryFormSection />}
        {/* Info: (20250828 - Julian) Result Part */}
        {isPaySlipTab && (
          <div className="flex flex-col gap-7">
            <ProgressBar />
            <SalaryResultSection />
          </div>
        )}
      </div>
    </main>
  );
};

export default SalaryCalculatorPageBody;
