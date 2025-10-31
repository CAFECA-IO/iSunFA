import React, { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { haloStyle } from '@/constants/display';
import { IExperienceDate, IWorkExperience } from '@/interfaces/experience';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import { useHiringCtx } from '@/contexts/hiring_context';
import { IoClose } from 'react-icons/io5';

interface IWorkExperienceModalProps {
  modalVisibilityHandler: () => void;
  editId: number | null;
}

// Info: (20250505 - Julian) 設定日期最早從 2015 年開始
const MIN_DATE = '2015-01';
// Info: (20250505 - Julian) 設定日期最晚到 2025 年
const MAX_DATE = '2025-12';

const WorkExperienceModal: React.FC<IWorkExperienceModalProps> = ({
  modalVisibilityHandler,
  editId,
}) => {
  const { t } = useTranslation(['hiring']);
  const { tempWorkList, addWorkExperience, updateWorkExperience, removeWorkExperience } =
    useHiringCtx();

  const initialData = tempWorkList.find((work) => work.id === editId);
  const isEditMode = editId !== null;

  const inputStyle = `${haloStyle} rounded-full outline-none h-60px w-full px-24px placeholder:text-landing-page-gray placeholder:opacity-50 focus:border-surface-brand-primary`;

  const {
    companyName: initialCompanyName,
    position: initialPosition,
    start: initialStart,
    end: initialEnd,
    description: initialDescription,
    leavingReason: initialLeavingReason,
  } = initialData || {
    companyName: '',
    position: '',
    start: { year: 0, month: 0 },
    end: { year: 0, month: 0 },
    description: '',
    leavingReason: '',
  };

  const [companyNameInput, setCompanyNameInput] = useState<string>(initialCompanyName);
  const [positionInput, setPositionInput] = useState<string>(initialPosition);
  const [startDate, setStartDate] = useState<IExperienceDate>(initialStart);
  const [endDate, setEndDate] = useState<IExperienceDate>(initialEnd);
  const [descriptionInput, setDescriptionInput] = useState<string>(initialDescription ?? '');
  const [leavingReasonInput, setLeavingReasonInput] = useState<string>(initialLeavingReason ?? '');

  const startDateValueFormat = `${startDate.year}-${String(startDate.month).padStart(2, '0')}`;
  const endDateValueFormat = `${endDate.year}-${String(endDate.month).padStart(2, '0')}`;

  // Info: (20250505 - Julian) 起始日期不能大於結束日期
  const maxOfStartDate =
    endDate.year !== 0 && endDate.month !== 0
      ? `${endDate.year}-${endDate.month.toString().padStart(2, '0')}`
      : MAX_DATE;
  // Info: (20250505 - Julian) 結束日期不能小於起始日期
  const minOfEndDate =
    startDate.year !== 0 && startDate.month !== 0
      ? `${startDate.year}-${startDate.month.toString().padStart(2, '0')}`
      : MIN_DATE;

  const changeCompanyNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyNameInput(e.target.value);
  };
  const changePositionInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPositionInput(e.target.value);
  };
  const changeStartTimestamp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    setStartDate({ year, month });
  };
  const changeEndTimestamp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    setEndDate({ year, month });
  };
  const changeDescriptionInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescriptionInput(e.target.value);
  };
  const changeLeavingReasonInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLeavingReasonInput(e.target.value);
  };

  // Info: (20250505 - Julian) 刪除按鈕
  const deleteHandler = () => {
    if (!isEditMode) return;
    removeWorkExperience(editId);
    modalVisibilityHandler();
  };

  // Info: (20250505 - Julian) 儲存按鈕
  const saveHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isEditMode) {
      // Info: (20250506 - Julian) 編輯模式: 更新工作經歷
      const updatedWorkExperience: IWorkExperience = {
        id: editId,
        companyName: companyNameInput,
        position: positionInput,
        start: startDate,
        end: endDate,
        description: descriptionInput,
        leavingReason: leavingReasonInput,
      };
      updateWorkExperience(editId, updatedWorkExperience);
    } else {
      // Info: (20250506 - Julian) 新增模式: 新增工作經歷
      // Info: (20250505 - Julian) new id -> 從 HiringContext 的 tempWorkList 中取得最後一筆資料的 id + 1；或者為 1
      const newId = tempWorkList.length - 1 >= 0 ? tempWorkList[tempWorkList.length - 1].id + 1 : 1;

      const workExperience: IWorkExperience = {
        id: newId,
        companyName: companyNameInput,
        position: positionInput,
        start: startDate,
        end: endDate,
        description: descriptionInput,
        leavingReason: leavingReasonInput,
      };

      // Info: (20250505 - Julian) 將工作經歷資訊加入 HiringContext
      addWorkExperience(workExperience);
    }

    // Info: (20250505 - Julian) 關閉 Modal
    modalVisibilityHandler();
  };

  const cancelButton = isEditMode ? (
    <LandingButton type="button" variant="default" className="font-bold" onClick={deleteHandler}>
      <FiTrash2 size={20} /> {t('hiring:COMMON.DELETE')}
    </LandingButton>
  ) : (
    <LandingButton
      type="button"
      variant="default"
      className="font-bold"
      onClick={modalVisibilityHandler}
    >
      {t('common:COMMON.CANCEL')}
    </LandingButton>
  );

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <form
        onSubmit={saveHandler}
        className="relative mx-auto flex w-90vw flex-col items-stretch rounded-lg border border-white bg-landing-nav px-52px py-40px shadow-lg shadow-black/80 backdrop-blur-lg"
      >
        {/* Info: (20250415 - Julian) Modal Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-36px font-bold text-text-brand-primary-lv3">
            {t('hiring:EXPERIENCE.WORK_TITLE')}
          </h2>
          {/* Info: (20250415 - Julian) Close Button */}
          <button type="button" className="p-12px" onClick={modalVisibilityHandler}>
            <IoClose size={24} />
          </button>
        </div>
        {/* Info: (20250415 - Julian) Form Content */}
        <div className="mt-40px grid grid-cols-2 gap-x-44px gap-y-24px px-150px">
          {/* Info: (20250415 - Julian) Company Name */}
          <div className="flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:EXPERIENCE.COMPANY_NAME')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input
              type="text"
              placeholder="ASDF Inc."
              value={companyNameInput}
              onChange={changeCompanyNameInput}
              className={inputStyle}
              required
            />
          </div>
          {/* Info: (20250415 - Julian) Position */}
          <div className="flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:EXPERIENCE.POSITION')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input
              type="text"
              placeholder="Software Engineer"
              value={positionInput}
              onChange={changePositionInput}
              className={inputStyle}
              required
            />
          </div>
          {/* Info: (20250415 - Julian) Start Date */}
          <div className="flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:EXPERIENCE.START')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input
              type="month"
              value={startDateValueFormat}
              onChange={changeStartTimestamp}
              className={inputStyle}
              required
              min={MIN_DATE}
              max={maxOfStartDate}
            />
          </div>
          {/* Info: (20250415 - Julian) End Date */}
          <div className="flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:EXPERIENCE.END')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input
              type="month"
              value={endDateValueFormat}
              onChange={changeEndTimestamp}
              className={inputStyle}
              required
              min={minOfEndDate}
              max={MAX_DATE}
            />
          </div>
          {/* Info: (20250415 - Julian) Job Description */}
          <div className="col-span-2 flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:EXPERIENCE.JOB_DESCRIPTION')}
            </p>
            <input
              type="text"
              placeholder="If so, can you describe the job?"
              value={descriptionInput}
              onChange={changeDescriptionInput}
              className={inputStyle}
            />
          </div>
          {/* Info: (20250415 - Julian) Leaving Reason */}
          <div className="col-span-2 flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">{t('hiring:EXPERIENCE.LEAVING_REASON')}</p>
            <input
              type="text"
              placeholder="Would you mind sharing the reason?"
              value={leavingReasonInput}
              onChange={changeLeavingReasonInput}
              className={inputStyle}
            />
          </div>
        </div>
        {/* Info: (20250415 - Julian) Buttons */}
        <div className="ml-auto mt-40px flex items-center gap-lv-6">
          {cancelButton}
          <LandingButton type="submit" variant="primary" className="font-bold">
            {t('hiring:COMMON.SAVE')}
          </LandingButton>
        </div>
      </form>
    </div>
  );
};

export default WorkExperienceModal;
