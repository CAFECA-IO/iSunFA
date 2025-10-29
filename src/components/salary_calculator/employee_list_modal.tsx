import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaHashtag } from 'react-icons/fa6';
import { FiSearch } from 'react-icons/fi';
import { PiUserFill } from 'react-icons/pi';
import { RxCross2 } from 'react-icons/rx';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import { dummyEmployeeForCalc } from '@/interfaces/employees';

interface IEmployeeListModalProps {
  modalVisibleHandler: () => void;
}

const EmployeeListModal: React.FC<IEmployeeListModalProps> = ({ modalVisibleHandler }) => {
  const { t } = useTranslation('calculator');

  const [keyword, setKeyword] = useState<string>('');
  const { changeEmployeeName, changeEmployeeNumber, changeEmployeeEmail, setBaseSalary } =
    useCalculatorCtx();

  // Info: (20250711 - Julian) Get data from API
  const employeesList = dummyEmployeeForCalc.filter(
    (employee) =>
      employee.name.toLowerCase().includes(keyword.toLowerCase()) ||
      employee.number?.toLowerCase().includes(keyword.toLowerCase())
  );

  // ToDo: (20250711 - Julian) Search by keyword
  const changeKeyword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  const displayedEmployeesList =
    employeesList.length > 0 ? (
      employeesList.map((employee) => {
        // Info: (20250711 - Julian) 填入員工姓名、編號和本薪
        const handleClick = () => {
          changeEmployeeName(employee.name);
          changeEmployeeNumber(employee.number ?? '');
          changeEmployeeEmail(employee.email);
          setBaseSalary(employee.baseSalary);
          modalVisibleHandler();
        };

        return (
          <div
            key={employee.id}
            onClick={handleClick}
            className="group flex items-center bg-surface-neutral-surface-lv2 px-24px py-12px hover:cursor-pointer hover:bg-surface-brand-primary-soft"
          >
            <div className="flex flex-1 items-center gap-8px">
              <PiUserFill
                size={16}
                className="text-text-neutral-tertiary group-hover:text-text-neutral-primary"
              />
              <p className="font-medium text-text-neutral-secondary group-hover:text-text-neutral-primary">
                {employee.name}
              </p>
            </div>
            <div className="flex items-center gap-8px text-sm font-medium">
              <FaHashtag
                size={16}
                className="text-text-neutral-tertiary group-hover:text-text-neutral-primary"
              />
              <p className="text-text-neutral-secondary group-hover:text-text-neutral-primary">
                {employee.number}
              </p>
            </div>
          </div>
        );
      })
    ) : (
      <div className="p-20px">
        <p className="text-center text-text-neutral-secondary">
          {t('calculator:EMPLOYEE_LIST.NO_DATA')}
        </p>
      </div>
    );

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex w-90vw flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-440px">
        {/* Info: (20250711 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-40px py-16px">
          <h2 className="text-lg font-bold text-card-text-primary">
            {t('calculator:EMPLOYEE_LIST.MAIN_TITLE')}
          </h2>
          <button type="button" onClick={modalVisibleHandler} className="absolute right-20px">
            <RxCross2 scale={24} />
          </button>
        </div>
        {/* Info: (20250711 - Julian) Modal Body */}
        <div className="flex flex-col gap-24px px-40px py-24px">
          {/* Info: (20250711 - Julian) Search bar */}
          <div className="flex items-center rounded-sm border border-input-stroke-input">
            <div className="px-12px py-10px text-icon-surface-single-color-primary">
              <FiSearch size={16} />
            </div>
            <input
              type="text"
              value={keyword}
              onChange={changeKeyword}
              placeholder={t('calculator:EMPLOYEE_LIST.SEARCH_PLACEHOLDER')}
              className="flex-1 bg-transparent px-12px py-10px placeholder:text-input-text-input-placeholder"
            />
          </div>
          {/* Info: (20250711 - Julian) Employee list content */}
          <div className="flex max-h-500px flex-col divide-y divide-stroke-neutral-quaternary overflow-y-auto pb-30px">
            {displayedEmployeesList}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeListModal;
