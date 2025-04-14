import React, { useState, useRef, useEffect } from 'react';
import { FaChevronRight, FaChevronLeft, FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import { IEducationExperience, dummyEducationExperience } from '@/interfaces/experience';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import EducationExperienceModal from '@/components/join_us/education_experience_modal';

interface IExperienceFormProps {
  toPrevStep: () => void;
  toNextStep: () => void;
}

// ToDo: (20250411 - Julian) during the development
const years = Array.from({ length: 10 }, (_, i) => 2024 - i).reverse();
const yearsWithDivider = years.flatMap(
  (item, index) => (index < years.length - 1 ? [item, '-'] : [item]) // Info: (20250414 - Julian) Add divider between years
);

const EducationExperience: React.FC<IEducationExperience> = ({
  schoolName,
  department,
  start,
  end,
}) => {
  const mainColor = {
    text: 'text-surface-support-strong-maple',
    bg: 'bg-surface-support-strong-maple',
  };

  const startPosition = yearsWithDivider.findIndex((year) => year === start.year);
  const endPosition = yearsWithDivider.findIndex((year) => year === end.year);

  return (
    <div
      key={schoolName}
      className="flex flex-col items-start gap-14px"
      style={{
        gridColumnStart: startPosition + 1,
        gridColumnEnd: endPosition + 1,
      }}
    >
      <p className={`${mainColor.text} font-semibold`}>{schoolName}</p>
      <p className="">
        {department} -{' '}
        <span className="text-landing-page-gray">
          {start.year}/{start.month} - {end.year}/{end.month}
        </span>
      </p>
      <div className={`${mainColor.bg} h-24px w-full rounded-full`}></div>
    </div>
  );
};

const ExperienceForm: React.FC<IExperienceFormProps> = ({ toPrevStep, toNextStep }) => {
  const { t } = useTranslation(['hiring']);
  const milestoneRef = useRef<HTMLDivElement>(null);

  const [isShowLeftArrow, setIsShowLeftArrow] = useState(false);
  const [isShowRightArrow, setIsShowRightArrow] = useState(true);
  const [isShowEducationModal, setIsShowEducationModal] = useState(false);

  // ToDo: (20250411 - Julian) during the development
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [educationList, setEducationList] =
    useState<IEducationExperience[]>(dummyEducationExperience);

  const milestoneTemplateColumns = `repeat(${years.length}, 80px 200px)`;

  useEffect(() => {
    const handleScroll = () => {
      if (milestoneRef.current) {
        const { scrollLeft, clientWidth, scrollWidth } = milestoneRef.current;
        setIsShowLeftArrow(scrollLeft > 0);
        setIsShowRightArrow(scrollLeft + clientWidth < scrollWidth);
      }
    };

    const currentMilestoneRef = milestoneRef.current;
    currentMilestoneRef?.addEventListener('scroll', handleScroll);

    return () => {
      currentMilestoneRef?.removeEventListener('scroll', handleScroll);
    };
  }, [milestoneRef]);

  const toggleEducationModal = () => setIsShowEducationModal((prev) => !prev);

  const scrollMilestone = (direction: 'L' | 'R') => {
    const container = milestoneRef.current;
    if (!container) return;

    const scrollAmount = 200;

    container.scrollBy({
      left: direction === 'L' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Info: (20250411 - Julian) Left Arrow
  const isDisplayLeftArrow = (
    <div
      className={`${isShowLeftArrow ? 'visible' : 'invisible'} sticky left-0 flex h-480px items-center bg-gradient-to-r from-landing-page-black from-60% to-transparent pr-80px`}
    >
      <button type="button" className="p-8px" onClick={() => scrollMilestone('L')}>
        <FaChevronLeft size={40} />
      </button>
    </div>
  );

  // Info: (20250411 - Julian) Right Arrow
  const isDisplayRightArrow = (
    <div
      className={`${isShowRightArrow ? 'visible' : 'invisible'} sticky right-0 flex h-480px items-center bg-gradient-to-l from-landing-page-black from-60% to-transparent pl-80px`}
    >
      <button type="button" className="p-8px" onClick={() => scrollMilestone('R')}>
        <FaChevronRight size={40} />
      </button>
    </div>
  );

  const displayEducation = (
    <div
      className="grid grid-flow-row items-center gap-8px"
      style={{
        gridTemplateColumns: milestoneTemplateColumns,
      }}
    >
      {educationList.map((education) => (
        <EducationExperience key={education.id} {...education} />
      ))}
    </div>
  );

  // Info: (20250411 - Julian) Milestone
  const yearLine = (
    <div
      className="grid grid-flow-row items-center gap-8px"
      style={{
        gridTemplateColumns: milestoneTemplateColumns,
      }}
    >
      {yearsWithDivider.map((year, index) => {
        if (year === '-') {
          // Info: (20250411 - Julian) Divider
          return (
            <div
              id={`${index + 1}`}
              key={year}
              className="h-px w-200px bg-landing-page-gray3"
            ></div>
          );
        } else {
          return (
            <p
              id={`${index + 1}`}
              key={year}
              className="text-center text-2xl text-landing-page-gray2"
            >
              {year}
            </p>
          );
        }
      })}
    </div>
  );

  const displayMilestone = (
    <div className="flex min-h-480px flex-col justify-center gap-10px">
      {displayEducation}
      {yearLine}
    </div>
  );

  return (
    <div className="relative flex flex-col items-stretch gap-10px">
      <LandingButton variant="primary" className="font-bold" onClick={toggleEducationModal}>
        <FaPlus size={20} /> {t('hiring:EXPERIENCE.EDUCATION_TITLE')}
      </LandingButton>

      {/* Info: (20250411 - Julian) Milestone */}
      <div ref={milestoneRef} className="relative flex w-90vw items-center overflow-x-auto">
        {isDisplayLeftArrow}
        {displayMilestone}
        {isDisplayRightArrow}
      </div>

      <div className="flex items-center justify-between">
        <LandingButton variant="primary" className="font-bold">
          <FaPlus size={20} /> {t('hiring:EXPERIENCE.WORK_TITLE')}
        </LandingButton>

        <div className="flex items-center gap-lv-6">
          {/* Info: (20250411 - Julian) Back Button */}
          <LandingButton variant="default" className="font-bold" onClick={toPrevStep}>
            {t('hiring:COMMON.PREVIOUS')}
          </LandingButton>

          {/* Info: (20250411 - Julian) Next Button */}
          <LandingButton variant="primary" className="font-bold" onClick={toNextStep}>
            {t('hiring:COMMON.NEXT')}
          </LandingButton>
        </div>
      </div>

      {/* Info: (20250411 - Julian) Education Experience Modal */}
      {isShowEducationModal && (
        <EducationExperienceModal modalVisibilityHandler={toggleEducationModal} />
      )}
    </div>
  );
};

export default ExperienceForm;
