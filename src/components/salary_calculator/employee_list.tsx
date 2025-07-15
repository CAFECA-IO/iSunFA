import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaHashtag, FaRegEnvelope, FaPlus } from 'react-icons/fa6';
import { FiEdit, FiSearch } from 'react-icons/fi';
import { LuTrash2 } from 'react-icons/lu';
import { PiUserFill } from 'react-icons/pi';
import { IEmployeeForCalc, dummyEmployeeForCalc } from '@/interfaces/employees';
import Pagination from '@/components/pagination/pagination';
import { Button } from '@/components/button/button';

const cellStyle =
  'table-cell align-middle border-b border-stroke-neutral-quaternary px-24px py-12px';

const EmployeeItem: React.FC<{
  employee: IEmployeeForCalc;
}> = ({ employee }) => {
  const { name, number, email } = employee;

  return (
    <div className="table-row">
      {/* Info: (20250715 - Julian) Name */}
      <div className={`${cellStyle}`}>
        <div className="flex items-center gap-8px">
          <PiUserFill size={16} className="text-text-neutral-tertiary" /> {name}
        </div>
      </div>
      {/* Info: (20250715 - Julian) Number */}
      <div className={`${cellStyle}`}>
        <div className="flex items-center gap-8px">
          <FaHashtag size={16} className="text-text-neutral-tertiary" /> {number}
        </div>
      </div>
      {/* Info: (20250715 - Julian) Email */}
      <div className={`${cellStyle}`}>
        <div className="flex items-center gap-8px">
          <FaRegEnvelope size={16} className="text-text-neutral-tertiary" /> {email}
        </div>
      </div>
      {/* Info: (20250715 - Julian) Action buttons */}
      <div className={`${cellStyle} w-100px`}>
        <div className="flex items-center gap-8px">
          {/* Info: (20250715 - Julian) Edit button */}
          <button
            type="button"
            className="p-10px text-button-text-secondary hover:text-button-stroke-primary-hover"
          >
            <FiEdit size={16} />
          </button>
          {/* Info: (20250715 - Julian) Delete button */}
          <button
            type="button"
            className="p-10px text-button-text-secondary hover:text-button-stroke-primary-hover"
          >
            <LuTrash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const EmployeeList: React.FC = () => {
  const { t } = useTranslation('calculator');

  const employeeList = dummyEmployeeForCalc;

  const [keyword, setKeyword] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  // ToDo: (20250715 - Julian) Get total pages from API
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [totalPages, setTotalPages] = useState(0);

  const changeKeyword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  const displayedEmployees = employeeList.map((employee) => (
    <EmployeeItem key={employee.id} employee={employee} />
  ));

  return (
    <div className="flex w-full flex-col items-center gap-24px">
      <div className="flex w-full items-center gap-40px">
        {/* Info: (20250715 - Julian) Search bar */}
        <div className="flex flex-1 items-center rounded-sm border border-input-stroke-input">
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

        {/* Info: (20250715 - Julian) Add New Employee button */}
        <Button>
          <FaPlus size={16} />
          <p>{t('calculator:EMPLOYEE_LIST.ADD_EMPLOYEE')}</p>
        </Button>
      </div>

      {/* Info: (20250715 - Julian) Employee List */}
      <div className="table w-full bg-surface-neutral-surface-lv2 text-sm font-medium text-text-neutral-secondary">
        <div className="table-header-group">
          <div className="table-row">
            <div className={`${cellStyle}`}>{t('calculator:EMPLOYEE_LIST.NAME')}</div>
            <div className={`${cellStyle}`}>{t('calculator:EMPLOYEE_LIST.NUMBER')}</div>
            <div className={`${cellStyle}`}>{t('calculator:EMPLOYEE_LIST.EMAIL')}</div>
            <div className={`${cellStyle}`}>{t('calculator:EMPLOYEE_LIST.ACTION')}</div>
          </div>
        </div>
        <div className="table-row-group">{displayedEmployees}</div>
      </div>
      {/* Info: (20250715 - Julian) Pagination */}
      <Pagination
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />
    </div>
  );
};

export default EmployeeList;
