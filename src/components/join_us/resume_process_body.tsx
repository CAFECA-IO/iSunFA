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
    const isActive = index + 1 === currentStep;
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

    return (
      <>
        {/* Info: (20250409 - Julian) Step Icon */}
        <div
          key={`${step}_icon`}
          className={`z-10 flex w-80px flex-col items-center gap-4px ${
            isActive ? 'text-stepper-text-active' : 'text-stepper-text-default'
          }`}
        >
          <Image
            src={
              isActive
                ? `/stepper/resume_${step}_active.svg`
                : `/stepper/resume_${step}_default.svg`
            }
            width={30}
            height={30}
            alt={`step_${index + 1}_icon`}
          />
          <p>{t(`hiring:${step}`)}</p>
        </div>

        {/* Info: (20250409 - Julian) Connecting Line */}
        <div
          className={`absolute ${connLinePosition} top-12px h-4px w-150px bg-stepper-surface-base`}
        ></div>
      </>
    );
  });

  return <div className="relative flex items-center gap-70px text-xs md:text-sm">{steppers}</div>;
};

const ResumeProcessBody: React.FC = () => {
  return (
    <div className="flex flex-col items-center gap-90px">
      <ResumeStepper currentStep={1} />
    </div>
  );
};

export default ResumeProcessBody;
