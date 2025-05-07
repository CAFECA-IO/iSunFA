import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';

interface IResumeStepperProps {
  currentStep: number;
}

const ResumeStepper: React.FC<IResumeStepperProps> = ({ currentStep }) => {
  const { t } = useTranslation(['hiring']);

  // Info: (20250410 - Julian) 個人資料 ➡️ 經歷 ➡️ 技能 ➡️ 偏好 ➡️ 附件
  const steps = ['personal', 'experience', 'skills', 'preference', 'attachment'];

  const steppers = steps.map((step, index) => {
    const defaultIcon = `/stepper/resume_${step}_default.svg`;
    const activeIcon = `/stepper/resume_${step}_active.svg`;

    const activeStyle = currentStep >= index + 1 ? 'opacity-100' : 'opacity-0';

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

    const connLineActiveWidth = currentStep > index + 1 ? 'w-150px' : 'w-0';

    return (
      <>
        {/* Info: (20250409 - Julian) Step Icon */}
        <div
          key={`${step}_icon`}
          className={`z-10 flex w-80px flex-col items-center gap-4px ${textColor} text-xs font-medium`}
        >
          <div className="relative">
            <Image src={defaultIcon} width={30} height={30} alt={`${step}_icon_default`} />
            <Image
              src={activeIcon}
              width={30}
              height={30}
              alt={`${step}_icon_active`}
              className={`${activeStyle} absolute left-0 top-0 z-20 transition-all duration-500`}
            />
          </div>
          <p className="transition-all duration-500">
            {t(`hiring:RESUME_PAGE.STEP_${step.toUpperCase()}`)}
          </p>
        </div>

        {/* Info: (20250409 - Julian) Connecting Line */}
        <div
          key={`${step}_line`}
          className={`absolute ${connLinePosition} top-12px z-0 h-4px w-150px`}
        >
          <div className="h-full w-full bg-stepper-surface-base"></div>
          <div
            className={`absolute left-0 top-0 z-10 bg-surface-brand-primary ${connLineActiveWidth} h-full transition-all duration-500`}
          ></div>
        </div>
      </>
    );
  });

  return <div className="relative flex items-center gap-70px text-xs md:text-sm">{steppers}</div>;
};

export default ResumeStepper;
