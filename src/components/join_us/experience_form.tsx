import React, { useState, useRef, useEffect } from 'react';
import { FaChevronRight, FaChevronLeft, FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import {
  ExperienceType,
  IEducationExperience,
  dummyEducationExperience,
  IWorkExperience,
  IExperienceBar,
  dummyWorkExperience,
} from '@/interfaces/experience';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import EducationExperienceModal from '@/components/join_us/education_experience_modal';
import WorkExperienceModal from '@/components/join_us/work_experience_modal';

interface IExperienceFormProps {
  toPrevStep: () => void;
  toNextStep: () => void;
}

interface IExperienceBarProps {
  type: ExperienceType;
  mainColor: {
    text: string;
    bg: string;
  };
  data: IExperienceBar;
}

// ToDo: (20250411 - Julian) during the development
const years = Array.from({ length: 10 }, (_, i) => 2024 - i).reverse();
const yearsWithDivider = years.flatMap(
  (item, index) => (index < years.length - 1 ? [item, '-'] : [item]) // Info: (20250414 - Julian) Add divider between years
);

// Info: (20250415 - Julian) Experience Bar Color
const mainColors = [
  {
    text: 'text-surface-support-strong-maple',
    bg: 'bg-surface-support-strong-maple',
  },
  {
    text: 'text-surface-support-strong-taro',
    bg: 'bg-surface-support-strong-taro',
  },
  {
    text: 'text-surface-support-strong-rose',
    bg: 'bg-surface-support-strong-rose',
  },
  {
    text: 'text-surface-support-strong-green',
    bg: 'bg-surface-support-strong-green',
  },
  {
    text: 'text-surface-support-strong-pink',
    bg: 'bg-surface-support-strong-pink',
  },
  {
    text: 'text-surface-support-strong-indigo',
    bg: 'bg-surface-support-strong-indigo',
  },
];

const ExperienceBar: React.FC<IExperienceBarProps> = ({ type, mainColor, data }) => {
  const { mainTitle, subTitle, start, end } = data;

  // Info: (20250415 - Julian)
  /* 1. 找出目標年份在 yearsWithDivider 陣列中的位置
  /* 2. 判斷開始月份是否大於 6，若是則 offset 為 1，否則為 0 (結束日期則是 2 或 1)
  /* 3. 將 startIndex 乘以 2 （因為年份格子被分成兩半），再加上 offset 得到位置 */

  const startIndex = yearsWithDivider.findIndex((year) => year === start.year);
  const startOffset = start.month > 6 ? 1 : 0;
  const startPosition = startIndex === -1 ? 0 : 1 + startIndex * 2 + startOffset;

  const endIndex = yearsWithDivider.findIndex((year) => year === end.year);
  const endOffset = end.month > 6 ? 2 : 1;
  const endPosition = endIndex === -1 ? yearsWithDivider.length - 1 : endIndex * 2 + endOffset + 1;

  return (
    <div
      className="flex flex-col items-start gap-14px whitespace-nowrap"
      style={{
        gridColumnStart: startPosition,
        gridColumnEnd: endPosition,
      }}
    >
      {/* Info: (20250415 - Julian) 工作經歷的 line bar 在上方 */}
      {type === ExperienceType.WORK && (
        <div className={`${mainColor.bg} h-24px w-full rounded-full`}></div>
      )}
      <p className={`${mainColor.text} font-semibold`}>{mainTitle}</p>
      <p className="">
        {subTitle} -{' '}
        <span className="text-landing-page-gray">
          {start.year}/{start.month} - {end.year}/{end.month}
        </span>
      </p>
      {/* Info: (20250415 - Julian) 學歷的 line bar 在下方 */}
      {type === ExperienceType.EDUCATION && (
        <div className={`${mainColor.bg} h-24px w-full rounded-full`}></div>
      )}
    </div>
  );
};

const ExperienceForm: React.FC<IExperienceFormProps> = ({ toPrevStep, toNextStep }) => {
  const { t } = useTranslation(['hiring']);
  const milestoneRef = useRef<HTMLDivElement>(null);

  const [isShowLeftArrow, setIsShowLeftArrow] = useState<boolean>(false);
  const [isShowRightArrow, setIsShowRightArrow] = useState<boolean>(true);
  const [isShowEducationModal, setIsShowEducationModal] = useState<boolean>(false);
  const [isShowWorkModal, setIsShowWorkModal] = useState<boolean>(false);

  // ToDo: (20250411 - Julian) during the development
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [educationList, setEducationList] =
    useState<IEducationExperience[]>(dummyEducationExperience);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [workList, setWorkList] = useState<IWorkExperience[]>(dummyWorkExperience);

  // Info: (20250415 - Julian) | 40px | 48px | 50px | 58px | (將每個格子分成 2 等份，加上間隔)
  const milestoneTemplateColumns = `repeat(${years.length}, 40px 48px 50px 58px)`;

  // Info: (20250415 - Julian) 監聽滾動事件，判斷是否顯示左右箭頭
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
  const toggleWorkModal = () => setIsShowWorkModal((prev) => !prev);

  // Info: (20250415 - Julian) 滾動事件
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
      className={`${isShowLeftArrow ? 'visible' : 'invisible'} sticky left-0 flex items-center bg-gradient-to-r from-landing-page-black from-60% to-transparent pr-80px`}
    >
      <button type="button" className="p-8px" onClick={() => scrollMilestone('L')}>
        <FaChevronLeft size={40} />
      </button>
    </div>
  );

  // Info: (20250411 - Julian) Right Arrow
  const isDisplayRightArrow = (
    <div
      className={`${isShowRightArrow ? 'visible' : 'invisible'} sticky right-0 flex items-center bg-gradient-to-l from-landing-page-black from-60% to-transparent pl-80px`}
    >
      <button type="button" className="p-8px" onClick={() => scrollMilestone('R')}>
        <FaChevronRight size={40} />
      </button>
    </div>
  );

  const displayEducation = educationList.map((education, index) => {
    const educationData: IExperienceBar = {
      id: education.id,
      mainTitle: education.schoolName,
      subTitle: education.department,
      start: education.start,
      end: education.end,
    };

    return (
      <div
        className="grid grid-flow-row items-center"
        style={{
          gridTemplateColumns: milestoneTemplateColumns,
        }}
      >
        <ExperienceBar
          key={education.id}
          type={ExperienceType.EDUCATION}
          mainColor={mainColors[index]}
          data={educationData}
        />
      </div>
    );
  });

  const displayWork = workList.map((work, index) => {
    const workData: IExperienceBar = {
      id: work.id,
      mainTitle: work.position,
      subTitle: work.companyName,
      start: work.start,
      end: work.end,
    };

    return (
      <div
        className="grid grid-flow-row items-center"
        style={{
          gridTemplateColumns: milestoneTemplateColumns,
        }}
      >
        <ExperienceBar
          key={work.id}
          type={ExperienceType.WORK}
          mainColor={mainColors[index]}
          data={workData}
        />
      </div>
    );
  });

  // Info: (20250411 - Julian) Milestone
  const yearLine = (
    <div
      className="grid grid-flow-row items-center"
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
              className="col-span-2 h-px w-100px bg-landing-page-gray3"
            ></div>
          );
        } else {
          return (
            <p
              id={`${index + 1}`}
              key={year}
              className="col-span-2 text-center text-2xl text-landing-page-gray2"
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
      {displayWork}
    </div>
  );

  return (
    <div className="relative flex flex-col items-stretch gap-10px">
      <LandingButton variant="primary" className="font-bold" onClick={toggleEducationModal}>
        <FaPlus size={20} /> {t('hiring:EXPERIENCE.EDUCATION_TITLE')}
      </LandingButton>

      {/* Info: (20250411 - Julian) Milestone */}
      <div ref={milestoneRef} className="relative flex w-90vw items-stretch overflow-x-auto">
        {isDisplayLeftArrow}
        {displayMilestone}
        {isDisplayRightArrow}
      </div>

      <div className="z-100 flex items-center justify-between">
        <LandingButton variant="primary" className="font-bold" onClick={toggleWorkModal}>
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

      {/* Info: (20250415 - Julian) Work Experience Modal */}
      {isShowWorkModal && <WorkExperienceModal modalVisibilityHandler={toggleWorkModal} />}
    </div>
  );
};

export default ExperienceForm;
