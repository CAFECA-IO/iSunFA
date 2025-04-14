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

const ExperienceForm: React.FC<IExperienceFormProps> = ({ toPrevStep, toNextStep }) => {
  const { t } = useTranslation(['hiring']);
  const milestoneRef = useRef<HTMLDivElement>(null);

  const [isShowLeftArrow, setIsShowLeftArrow] = useState(false);
  const [isShowRightArrow, setIsShowRightArrow] = useState(true);
  const [isShowEducationModal, setIsShowEducationModal] = useState(false);

  // ToDo: (20250411 - Julian) during the development
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [educationList, setEducationList] = useState<IEducationExperience[]>([
    dummyEducationExperience,
  ]);

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

  // ToDo: (20250411 - Julian) during the development
  const years = Array.from({ length: 10 }, (_, i) => 2024 - i).reverse();

  // Info: (20250411 - Julian) Left Arrow
  const isDisplayLeftArrow = (
    <div
      className={`${isShowLeftArrow ? 'visible' : 'invisible'} sticky left-0 flex h-full items-center bg-gradient-to-r from-landing-page-black from-60% to-transparent pr-80px`}
    >
      <button type="button" className="p-8px" onClick={() => scrollMilestone('L')}>
        <FaChevronLeft size={40} />
      </button>
    </div>
  );

  // Info: (20250411 - Julian) Right Arrow
  const isDisplayRightArrow = (
    <div
      className={`${isShowRightArrow ? 'visible' : 'invisible'} sticky right-0 flex h-full items-center bg-gradient-to-l from-landing-page-black from-60% to-transparent pl-80px`}
    >
      <button type="button" className="p-8px" onClick={() => scrollMilestone('R')}>
        <FaChevronRight size={40} />
      </button>
    </div>
  );

  // Info: (20250411 - Julian) Milestone
  const displayMilestone = (
    <div className="grid h-480px w-max grid-flow-col grid-rows-1 items-center gap-8px">
      {years.map((year, index) => (
        <>
          {index !== 0 && (
            // Info: (20250411 - Julian) Divider
            <div key={`${year}-line`} className="h-px w-80px bg-landing-page-gray3"></div>
          )}
          <p key={year} className="text-2xl text-landing-page-gray2">
            {year}
          </p>
        </>
      ))}
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
