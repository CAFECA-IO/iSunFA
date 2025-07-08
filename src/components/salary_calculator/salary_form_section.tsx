import React, { useState } from 'react';
import ProgressBar from '@/components/salary_calculator/progress_bar';
import StepTabs from '@/components/salary_calculator/step_tabs';

const SalaryFormSection: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);

  // Info: (20250708 - Julian) 總共四個步驟，每個步驟佔 25% 的進度
  const progress = currentStep * 25;

  // ToDo: (20250708 - Julian) During development
  const resetHandler = () => {
    setCurrentStep(1);
  };

  return (
    <div className="flex flex-col gap-lv-8 p-80px">
      {/* Info: (20250708 - Julian) Progress bar */}
      <ProgressBar progress={progress} resetHandler={resetHandler} />
      {/* Info: (20250708 - Julian) Step Tabs */}
      <StepTabs currentStep={currentStep} />
    </div>
  );
};

export default SalaryFormSection;
