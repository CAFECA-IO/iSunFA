import React from 'react';
import ProgressBar from '@/components/salary_calculator/progress_bar';
import StepTabs from '@/components/salary_calculator/step_tabs';
import BasicInfoForm from '@/components/salary_calculator/basic_info_form';
import BasePayForm from '@/components/salary_calculator/base_pay_form';
import WorkHoursForm from '@/components/salary_calculator/work_hours_form';
import OthersForm from '@/components/salary_calculator/others_form';
import { useCalculatorCtx } from '@/contexts/calculator_context';

const SalaryFormSection: React.FC = () => {
  const { currentStep } = useCalculatorCtx();

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
    <div className="flex flex-col gap-lv-8 p-80px">
      {/* Info: (20250708 - Julian) Progress bar */}
      <ProgressBar />
      {/* Info: (20250708 - Julian) Step Tabs */}
      <StepTabs />
      {/* Info: (20250709 - Julian) Form */}
      {displayedForm}
    </div>
  );
};

export default SalaryFormSection;
