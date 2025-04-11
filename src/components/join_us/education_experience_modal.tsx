import React, { useState } from 'react';
import Image from 'next/image';
import { FaChevronDown } from 'react-icons/fa6';
import { FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { haloStyle } from '@/constants/display';
import { LandingButton } from '@/components/landing_page_v2/landing_button';

interface IEducationExperienceModalProps {
  modalVisibilityHandler: () => void;
}

enum Degree {
  ElementarySchool = 'ElementarySchool',
  JuniorHigh = 'JuniorHigh',
  HighSchool = 'HighSchool',
  BachelorsDegree = 'BachelorsDegree',
  MastersOrGraduate = 'MastersOrGraduate',
  ProfessionalDegrees = 'ProfessionalDegrees',
}

// enum SchoolStatus {
//   Graduated = 'Graduated',
//   InSchool = 'In school',
//   Dropout = 'Dropout',
// }

const EducationExperienceModal: React.FC<IEducationExperienceModalProps> = ({
  modalVisibilityHandler,
}) => {
  const { t } = useTranslation(['hiring']);
  const inputStyle = `${haloStyle} rounded-full h-60px w-full px-24px placeholder:text-landing-page-gray placeholder:opacity-50 focus:border-surface-brand-primary`;

  const [selectedDegree, setSelectedDegree] = useState<Degree>(Degree.BachelorsDegree);
  //   const [schoolNameInput, setSchoolNameInput] = useState<string>('');
  //   const [departmentInput, setDepartmentInput] = useState<string>('');
  //   const [startTimestamp, setStartTimestamp] = useState<number>(0);
  //   const [endTimestamp, setEndTimestamp] = useState<number>(0);
  //   const [selectedStatus, setSelectedStatus] = useState<SchoolStatus>(SchoolStatus.Graduated);

  const {
    targetRef,
    componentVisible: isOpen,
    setComponentVisible: setIsOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleDegreeDropdown = () => setIsOpen((prev) => !prev);

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
            {t(`hiring:${option.toUpperCase()}`)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="relative mx-auto flex flex-col items-stretch rounded-lg border border-white bg-landing-nav px-52px pb-69px pt-46px shadow-lg shadow-black/80 backdrop-blur-lg">
        {/* Info: (20250411 - Julian) Modal Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-36px font-bold text-text-brand-primary-lv3">Education</h2>
          {/* Info: (20250411 - Julian) Close Button */}
          <button type="button" className="p-12px" onClick={modalVisibilityHandler}>
            <Image src="/icons/x_close.svg" width={24} height={24} alt="close_icon" />
          </button>
        </div>
        {/* Info: (20250411 - Julian) Form Content */}
        <div className="mt-42px grid grid-cols-2 gap-x-44px gap-y-24px">
          {/* Info: (20250411 - Julian) Degree */}
          <div ref={targetRef} className="relative flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              Degree<span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <div
              onClick={toggleDegreeDropdown}
              className={`${haloStyle} ${isOpen ? 'border-surface-brand-primary-moderate text-surface-brand-primary-moderate' : 'border-white'} flex h-60px items-center gap-8px rounded-full px-24px py-4px hover:cursor-pointer hover:border-surface-brand-primary-moderate hover:text-surface-brand-primary-moderate`}
            >
              <p className="w-300px">{t(`hiring:${selectedDegree.toUpperCase()}`)}</p>
              <FaChevronDown />
            </div>
            {degreeDropdown}
          </div>
          {/* Info: (20250411 - Julian) School Name */}
          <div className="flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              School Name<span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input type="text" placeholder="ABC University" className={inputStyle} />
          </div>
        </div>
        {/* Info: (20250411 - Julian) Buttons */}
        <div className="ml-auto mt-64px flex items-center gap-lv-6">
          <LandingButton variant="default" className="font-bold">
            <FiTrash2 size={20} /> Delete
          </LandingButton>
          <LandingButton variant="primary" className="font-bold">
            Save
          </LandingButton>
        </div>
      </div>
    </div>
  );
};

export default EducationExperienceModal;
