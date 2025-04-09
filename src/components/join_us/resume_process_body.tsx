import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';

interface IResumeStepperProps {
  currentStep: number;
}

// ToDo: (20250409 - Julian) 拆分成新的 component
const ResumeStepper: React.FC<IResumeStepperProps> = ({ currentStep }) => {
  const { t } = useTranslation(['hiring']);

  const steps = ['personal', 'experience', 'skills', 'preference', 'attachment'];

  const steppers = steps.map((step, index) => {
    const isActiveIcon = currentStep >= index + 1;
    const textColor =
      currentStep === index + 1
        ? 'text-stepper-text-active'
        : currentStep >= index + 1
          ? 'text-white'
          : 'text-stepper-text-default';

    const connLinePosition =
      index === 0
        ? 'left-40px'
        : index === 1
          ? 'left-200px'
          : index === 2
            ? 'left-350px'
            : index === 3
              ? 'left-500px'
              : 'hidden';

    const connLineColor =
      currentStep > index + 1 ? 'bg-surface-brand-primary' : 'bg-stepper-surface-base';

    return (
      <>
        {/* Info: (20250409 - Julian) Step Icon */}
        <div
          key={`${step}_icon`}
          className={`z-10 flex w-80px flex-col items-center gap-4px ${textColor}`}
        >
          <Image
            src={
              isActiveIcon
                ? `/stepper/resume_${step}_active.svg`
                : `/stepper/resume_${step}_default.svg`
            }
            width={30}
            height={30}
            alt={`step_${index + 1}_icon`}
          />
          <p>{t(`hiring:RESUME_PAGE.STEP_${step.toUpperCase()}`)}</p>
        </div>

        {/* Info: (20250409 - Julian) Connecting Line */}
        <div
          className={`absolute ${connLinePosition} ${connLineColor} top-12px h-4px w-150px`}
        ></div>
      </>
    );
  });

  return <div className="relative flex items-center gap-70px text-xs md:text-sm">{steppers}</div>;
};

const ResumeProcessBody: React.FC = () => {
  return (
    <div className="flex flex-col items-center gap-90px">
      <ResumeStepper currentStep={5} />
    </div>
  );
};

export default ResumeProcessBody;
