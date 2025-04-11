import React, { useState } from 'react';
import Image from 'next/image';
import { FaChevronDown } from 'react-icons/fa6';
import { FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import {
  Degree,
  SchoolStatus,
  IEducationExperience,
  IEducationDate,
} from '@/interfaces/experience';
import { haloStyle, orangeRadioStyle } from '@/constants/display';
import { LandingButton } from '@/components/landing_page_v2/landing_button';

interface IEducationExperienceModalProps {
  modalVisibilityHandler: () => void;
}

const EducationExperienceModal: React.FC<IEducationExperienceModalProps> = ({
  modalVisibilityHandler,
}) => {
  const { t } = useTranslation(['hiring']);
  const inputStyle = `${haloStyle} rounded-full h-60px w-full px-24px placeholder:text-landing-page-gray placeholder:opacity-50 focus:border-surface-brand-primary`;

  const [selectedDegree, setSelectedDegree] = useState<Degree>(Degree.ELEMENTARY);
  const [schoolNameInput, setSchoolNameInput] = useState<string>('');
  const [departmentInput, setDepartmentInput] = useState<string>('');
  const [startInput, setStartInput] = useState<IEducationDate>({
    year: 0,
    month: 0,
  });
  const [endInput, setEndInput] = useState<IEducationDate>({
    year: 0,
    month: 0,
  });
  const [selectedStatus, setSelectedStatus] = useState<SchoolStatus>(SchoolStatus.GRADUATED);

  const {
    targetRef,
    componentVisible: isOpen,
    setComponentVisible: setIsOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const startDateValueFormat = `${startInput.year}-${startInput.month.toString().padStart(2, '0')}`;
  const endDateValueFormat = `${endInput.year}-${endInput.month.toString().padStart(2, '0')}`;

  const toggleDegreeDropdown = () => setIsOpen((prev) => !prev);

  const changeSchoolNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSchoolNameInput(e.target.value);
  };
  const changeDepartmentInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDepartmentInput(e.target.value);
  };
  const changeStartTimestamp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setStartInput({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    });
  };
  const changeEndTimestamp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setEndInput({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    });
  };

  const saveHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const educationExperience: IEducationExperience = {
      degree: selectedDegree,
      schoolName: schoolNameInput,
      department: departmentInput,
      start: startInput,
      end: endInput,
      status: selectedStatus,
    };

    // Deprecated: (20250411 - Julian) For debugging purpose
    // eslint-disable-next-line no-console
    console.log('Education Experience:', educationExperience);
  };

  const degreeOptions = Object.values(Degree);

  const degreeDropdown = (
    <div
      className={`${
        isOpen ? 'grid-rows-1 opacity-100' : 'grid-rows-0 opacity-0'
      } ${haloStyle} absolute top-100px z-10 grid w-full grid-cols-1 overflow-hidden rounded-sm transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col">
        {degreeOptions.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => {
              setSelectedDegree(option);
              setIsOpen(false);
            }}
            className="px-24px py-16px text-left hover:text-landing-page-orange"
          >
            {t(`hiring:EXPERIENCE.DEGREE_OPTION_${option.toUpperCase()}`)}
          </button>
        ))}
      </div>
    </div>
  );

  const statusOptions = Object.values(SchoolStatus);

  const statusRadioButtons = statusOptions.map((option) => (
    <div key={option} className="flex items-center gap-8px">
      <input
        type="radio"
        id={option}
        name="status"
        value={option}
        checked={selectedStatus === option}
        onChange={() => setSelectedStatus(option)}
        className={orangeRadioStyle}
      />
      <label htmlFor={option} className="cursor-pointer text-base font-normal">
        {t(`hiring:EXPERIENCE.STATUS_OPTION_${option.toUpperCase()}`)}
      </label>
    </div>
  ));

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <form
        onSubmit={saveHandler}
        className="relative mx-auto flex w-90vw flex-col items-stretch rounded-lg border border-white bg-landing-nav px-52px pb-69px pt-46px shadow-lg shadow-black/80 backdrop-blur-lg"
      >
        {/* Info: (20250411 - Julian) Modal Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-36px font-bold text-text-brand-primary-lv3">
            {t('hiring:EXPERIENCE.EDUCATION_TITLE')}
          </h2>
          {/* Info: (20250411 - Julian) Close Button */}
          <button type="button" className="p-12px" onClick={modalVisibilityHandler}>
            <Image src="/icons/x_close.svg" width={24} height={24} alt="close_icon" />
          </button>
        </div>
        {/* Info: (20250411 - Julian) Form Content */}
        <div className="mt-42px grid grid-cols-2 gap-x-44px gap-y-24px px-150px">
          {/* Info: (20250411 - Julian) Degree */}
          <div ref={targetRef} className="relative flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:EXPERIENCE.DEGREE')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <div
              onClick={toggleDegreeDropdown}
              className={`${haloStyle} ${isOpen ? 'border-surface-brand-primary-moderate text-surface-brand-primary-moderate' : 'border-white'} flex h-60px items-center gap-8px rounded-full px-24px py-4px hover:cursor-pointer hover:border-surface-brand-primary-moderate hover:text-surface-brand-primary-moderate`}
            >
              <p className="flex-1">
                {t(`hiring:EXPERIENCE.DEGREE_OPTION_${selectedDegree.toUpperCase()}`)}
              </p>
              <FaChevronDown />
            </div>
            {degreeDropdown}
          </div>
          {/* Info: (20250411 - Julian) School Name */}
          <div className="flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:EXPERIENCE.SCHOOL_NAME')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input
              type="text"
              placeholder="ABC University"
              value={schoolNameInput}
              onChange={changeSchoolNameInput}
              className={inputStyle}
              required
            />
          </div>
          {/* Info: (20250411 - Julian) Department */}
          <div className="col-span-2 flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:EXPERIENCE.DEPARTMENT')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input
              type="text"
              placeholder="Economic"
              value={departmentInput}
              onChange={changeDepartmentInput}
              className={inputStyle}
              required
            />
          </div>
          {/* Info: (20250411 - Julian) Start Date */}
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
          {/* Info: (20250411 - Julian) End Date */}
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
          {/* Info: (20250411 - Julian) Status */}
          <div className="col-span-2 flex items-center gap-40px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:EXPERIENCE.STATUS')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            {statusRadioButtons}
          </div>
        </div>
        {/* Info: (20250411 - Julian) Buttons */}
        <div className="ml-auto mt-64px flex items-center gap-lv-6">
          <LandingButton variant="default" className="font-bold">
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

export default EducationExperienceModal;
