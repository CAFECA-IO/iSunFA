import React, { useState, useRef, useEffect } from 'react';
import { FaChevronRight, FaChevronLeft, FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import { ExperienceType, IExperienceBar } from '@/interfaces/experience';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import EducationExperienceModal from '@/components/join_us/education_experience_modal';
import WorkExperienceModal from '@/components/join_us/work_experience_modal';
import { useHiringCtx } from '@/contexts/hiring_context';

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
  clickHandler: (id: number) => void;
}

// Info: (20250506 - Julian) start from 2015
const years = Array.from({ length: 11 }, (_, i) => 2025 - i).reverse();
const yearsWithDivider = years.flatMap(
  (item, index) => (index < years.length - 1 ? [item, '-'] : [item]) // Info: (20250414 - Julian) Add divider between years
);

// Info: (20250415 - Julian) 經驗條的顏色
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

const ExperienceBar: React.FC<IExperienceBarProps> = ({ type, mainColor, data, clickHandler }) => {
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

  const clickBarHandler = () => clickHandler(data.id);

  return (
    <button
      type="button"
      onClick={clickBarHandler}
      className="flex flex-col items-start gap-14px whitespace-nowrap hover:opacity-75"
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
    </button>
  );
};

const ExperienceForm: React.FC<IExperienceFormProps> = ({ toPrevStep, toNextStep }) => {
  const { t } = useTranslation(['hiring']);
  const milestoneRef = useRef<HTMLDivElement>(null);
  const { tempEducationList, tempWorkList } = useHiringCtx();

  const [isShowLeftArrow, setIsShowLeftArrow] = useState<boolean>(false);
  const [isShowRightArrow, setIsShowRightArrow] = useState<boolean>(true);
  const [isShowEducationModal, setIsShowEducationModal] = useState<boolean>(false);
  const [isShowWorkModal, setIsShowWorkModal] = useState<boolean>(false);

  // Info: (20250505 - Julian) edit id
  const [editedEducationId, setEditedEducationId] = useState<number | null>(null);
  const [editedWorkId, setEditedWorkId] = useState<number | null>(null);

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
  // Info: (20250505 - Julian) 新增模式
  const addEducationHandler = () => {
    setIsShowEducationModal((prev) => !prev);
    setEditedEducationId(null);
  };

  const toggleWorkModal = () => setIsShowWorkModal((prev) => !prev);
  // Info: (20250505 - Julian) 新增模式
  const addWorkHandler = () => {
    setIsShowWorkModal((prev) => !prev);
    setEditedWorkId(null);
  };

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
      className={`${isShowLeftArrow ? 'visible' : 'invisible'} sticky left-0 z-30 flex items-center bg-gradient-to-r from-landing-page-black from-60% to-transparent pr-80px`}
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

  const displayEducation = tempEducationList.map((education, index) => {
    const educationData: IExperienceBar = {
      id: education.id,
      mainTitle: education.schoolName,
      subTitle: education.department,
      start: education.start,
      end: education.end,
    };

    // Info: (20250505 - Julian) 編輯模式
    const editEducationHandler = () => {
      setIsShowEducationModal(true);
      setEditedEducationId(education.id);
    };

    return (
      <div
        key={education.id}
        className="grid grid-flow-row items-center"
        style={{
          gridTemplateColumns: milestoneTemplateColumns,
        }}
      >
        <ExperienceBar
          key={`education-${education.id}`}
          type={ExperienceType.EDUCATION}
          mainColor={mainColors[index]}
          data={educationData}
          clickHandler={editEducationHandler}
        />
      </div>
    );
  });

  const displayWork = tempWorkList.map((work, index) => {
    const workData: IExperienceBar = {
      id: work.id,
      mainTitle: work.position,
      subTitle: work.companyName,
      start: work.start,
      end: work.end,
    };

    // Info: (20250505 - Julian) 編輯模式
    const editWorkHandler = () => {
      setIsShowWorkModal(true);
      setEditedWorkId(work.id);
    };

    return (
      <div
        key={work.id}
        className="grid grid-flow-row items-center"
        style={{
          gridTemplateColumns: milestoneTemplateColumns,
        }}
      >
        <ExperienceBar
          key={`work-${work.id}`}
          type={ExperienceType.WORK}
          mainColor={mainColors[5 - index]} // Info: (20250506 - Julian) 取得顏色的順序和學歷相反
          data={workData}
          clickHandler={editWorkHandler}
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
              // Deprecated: (20250506 - Luphia) remove eslint-disable
              // eslint-disable-next-line react/no-array-index-key
              key={`${index}`}
              className="col-span-2 h-px w-100px bg-landing-page-gray3"
            ></div>
          );
        } else {
          return (
            <p
              id={`${index + 1}`}
              // Deprecated: (20250506 - Luphia) remove eslint-disable
              // eslint-disable-next-line react/no-array-index-key
              key={`${index}`}
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
      <LandingButton variant="primary" className="font-bold" onClick={addEducationHandler}>
        <FaPlus size={20} /> {t('hiring:EXPERIENCE.EDUCATION_TITLE')}
      </LandingButton>

      {/* Info: (20250411 - Julian) Milestone */}
      <div ref={milestoneRef} className="relative flex w-90vw items-stretch overflow-x-auto">
        {isDisplayLeftArrow}
        {displayMilestone}
        {isDisplayRightArrow}
      </div>

      <div className="z-100 flex items-center justify-between">
        <LandingButton variant="primary" className="font-bold" onClick={addWorkHandler}>
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
        <EducationExperienceModal
          modalVisibilityHandler={toggleEducationModal}
          editId={editedEducationId}
        />
      )}

      {/* Info: (20250415 - Julian) Work Experience Modal */}
      {isShowWorkModal && (
        <WorkExperienceModal modalVisibilityHandler={toggleWorkModal} editId={editedWorkId} />
      )}
    </div>
  );
};

export default ExperienceForm;
