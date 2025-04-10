import React, { useState } from 'react';
import ResumeStepper from '@/components/join_us/resume_stepper';

const ResumeProcessBody: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentStep, setCurrentStep] = useState<number>(1);

  return (
    <div className="flex flex-col items-center gap-90px py-60px">
      <ResumeStepper currentStep={currentStep} />
    </div>
  );
};

export default ResumeProcessBody;
