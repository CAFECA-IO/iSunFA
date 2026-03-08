import React from "react";
import { AlertCircle } from "lucide-react";
import ProgressBar from "@/components/salary_calculator/progress_bar";
import StepTabs from "@/components/salary_calculator/step_tabs";
import BasicInfoForm from "@/components/salary_calculator/basic_info_form";
import BasePayForm from "@/components/salary_calculator/base_pay_form";
import WorkHoursForm from "@/components/salary_calculator/work_hours_form";
import OthersForm from "@/components/salary_calculator/others_form";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import { useTranslation } from "@/i18n/i18n_context";
import { getMinimumWage } from "@/lib/utils/salary_calculator";

const SalaryFormSection: React.FC = () => {
  const {
    currentStep,
    baseSalary,
    mealAllowance,
    selectedYear,
    totalTaxableHours,
    totalNonTaxableHours
  } = useCalculatorCtx();
  const { t } = useTranslation();

  const minimumWage = getMinimumWage(parseInt(selectedYear));
  const isSalaryBelowMinimum = (baseSalary + mealAllowance) < minimumWage;
  const isOvertimeExceeded = (totalTaxableHours + totalNonTaxableHours) > 46;

  const showWarning = isSalaryBelowMinimum || isOvertimeExceeded;

  const displayedForm =
    currentStep === 1 ? (
      <BasicInfoForm />
    ) : currentStep === 2 ? (
      <BasePayForm />
    ) : currentStep === 3 ? (
      <WorkHoursForm />
    ) : (
      <OthersForm />
    );

  return (
    <div className="flex w-full min-w-[320px] flex-col gap-7 lg:gap-8">
      {/* Info: (20250708 - Julian) Progress bar */}
      <ProgressBar />
      {/* Info: (20250708 - Julian) Step Tabs */}
      <StepTabs />
      {showWarning && (
        <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="h-4 w-4" />
            <span>{t("calculator.warnings.title")}</span>
          </div>
          <ul className="list-inside list-disc pl-6 text-red-700">
            {isSalaryBelowMinimum && (
              <li>{t("calculator.warnings.salary_below_minimum", { minimumWage: minimumWage.toLocaleString() })}</li>
            )}
            {isOvertimeExceeded && (
              <li>{t("calculator.warnings.overtime_exceeded")}</li>
            )}
          </ul>
        </div>
      )}
      {/* Info: (20250709 - Julian) Form */}
      {displayedForm}
    </div>
  );
};

export default SalaryFormSection;
