import React, { useState } from 'react';
import Image from 'next/image';
import { FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { haloStyle } from '@/constants/display';
import { IExperienceDate, IWorkExperience } from '@/interfaces/experience';
import { LandingButton } from '@/components/landing_page_v2/landing_button';

interface IWorkExperienceModalProps {
  modalVisibilityHandler: () => void;
}

const WorkExperienceModal: React.FC<IWorkExperienceModalProps> = ({ modalVisibilityHandler }) => {
  const { t } = useTranslation(['hiring']);
  const inputStyle = `${haloStyle} rounded-full h-60px w-full px-24px placeholder:text-landing-page-gray placeholder:opacity-50 focus:border-surface-brand-primary`;

  const [companyNameInput, setCompanyNameInput] = useState<string>('');
  const [positionInput, setPositionInput] = useState<string>('');
  const [startDate, setStartDate] = useState<IExperienceDate>({
    year: 0,
    month: 0,
  });
  const [endDate, setEndDate] = useState<IExperienceDate>({
    year: 0,
    month: 0,
  });
  const [descriptionInput, setDescriptionInput] = useState<string>('');
  const [leavingReasonInput, setLeavingReasonInput] = useState<string>('');

  const startDateValueFormat = `${startDate.year}-${String(startDate.month).padStart(2, '0')}`;
  const endDateValueFormat = `${endDate.year}-${String(endDate.month).padStart(2, '0')}`;

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

  const saveHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const workExperience: IWorkExperience = {
      id: 0, // Info: (20250415 - Julian) This will be set by the backend
      companyName: companyNameInput,
      position: positionInput,
      start: startDate,
      end: endDate,
      description: descriptionInput,
      leavingReason: leavingReasonInput,
    };

    // Deprecated: (20250415 - Julian) For debugging purpose
    // eslint-disable-next-line no-console
    console.log('Work Experience:', workExperience);
  };

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
            <Image src="/icons/x_close.svg" width={24} height={24} alt="close_icon" />
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
              placeholder="Place holder"
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
              placeholder="Economic"
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
            />
          </div>
          {/* Info: (20250415 - Julian) Job Description */}
          <div className="col-span-2 flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:EXPERIENCE.JOB_DESCRIPTION')}
            </p>
            <input
              type="text"
              placeholder="Economic"
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
              placeholder="Economic"
              value={leavingReasonInput}
              onChange={changeLeavingReasonInput}
              className={inputStyle}
            />
          </div>
        </div>
        {/* Info: (20250415 - Julian) Buttons */}
        <div className="ml-auto mt-40px flex items-center gap-lv-6">
          <LandingButton type="button" variant="default" className="font-bold">
            <FiTrash2 size={20} /> {t('hiring:COMMON.DELETE')}
          </LandingButton>
          <LandingButton type="submit" variant="primary" className="font-bold">
            {t('hiring:COMMON.SAVE')}
          </LandingButton>
        </div>
      </form>
    </div>
  );
};

export default WorkExperienceModal;
