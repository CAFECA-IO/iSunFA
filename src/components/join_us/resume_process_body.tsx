import React, { useState } from 'react';
import ResumeStepper from '@/components/join_us/resume_stepper';
import PersonalInfoForm from '@/components/join_us/personal_info_form';
import ExperienceForm from '@/components/join_us/experience_form';

const ResumeProcessBody: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const toNextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  // ToDo: (20250410 - Julian) during the development
  const showingForm =
    currentStep === 1 ? (
      <PersonalInfoForm toNextStep={toNextStep} />
    ) : currentStep === 2 ? (
      <ExperienceForm toNextStep={toNextStep} />
    ) : null;

  return (
    <div className="flex flex-col items-center gap-90px py-60px">
      <ResumeStepper currentStep={currentStep} />
      {showingForm}
    </div>
  );
};

export default ResumeProcessBody;
