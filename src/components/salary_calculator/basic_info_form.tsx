import React, { useState } from 'react';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FaChevronDown } from 'react-icons/fa6';
import { FiSearch } from 'react-icons/fi';
import { PiUserFill } from 'react-icons/pi';
import { RxCross2 } from 'react-icons/rx';
import { MONTHS } from '@/constants/month';
import NumericInput from '@/components/numeric_input/numeric_input';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import { dummyEmployeeForCalc } from '@/interfaces/employees';

const EmployeeListModal: React.FC<{
  modalVisibleHandler: () => void;
}> = ({ modalVisibleHandler }) => {
  // Info: (20250711 - Julian) Get data from API
  const employeesList = dummyEmployeeForCalc;

  const { changeEmployeeName, changeEmployeeNumber, setBaseSalary } = useCalculatorCtx();

  const displayedEmployeesList = employeesList.map((employee) => {
    // Info: (20250711 - Julian) 填入員工姓名、編號和本薪
    const handleClick = () => {
      changeEmployeeName(employee.name);
      changeEmployeeNumber(employee.number ?? '');
      setBaseSalary(employee.baseSalary);
      modalVisibleHandler();
    };

    return (
      <div
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
          <p className="text-text-neutral-tertiary group-hover:text-text-neutral-primary">#</p>
          <p className="text-text-neutral-secondary group-hover:text-text-neutral-primary">
            {employee.number}
          </p>
        </div>
      </div>
    );
  });

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-440px">
        {/* Info: (20250711 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-40px py-16px">
          <h2 className="text-lg font-bold text-card-text-primary">Employee List</h2>
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
              placeholder="Search for employee"
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

const BasicInfoForm: React.FC = () => {
  const yearOptions = ['2025', '2024', '2023'];
  const monthOptions = MONTHS;

  // ToDo: (20250711 - Julian) During development
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isNameError, setIsNameError] = useState<boolean>(false);
  const [isShowEmployeeListModal, setIsShowEmployeeListModal] = useState<boolean>(false);

  const {
    employeeName,
    changeEmployeeName,
    employeeNumber,
    changeEmployeeNumber,
    selectedYear,
    changeSelectedYear,
    selectedMonth,
    changeSelectedMonth,
    workedDays,
    setWorkedDays,
  } = useCalculatorCtx();

  const {
    targetRef: yearDropdownRef,
    componentVisible: isYearOpen,
    setComponentVisible: setIsYearOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: monthDropdownRef,
    componentVisible: isMonthOpen,
    setComponentVisible: setIsMonthOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20250710 - Julian) 當月的最大天數
  const maxDaysInMonth = selectedMonth.days === 28 ? 29 : selectedMonth.days;

  // Info: (20250711 - Julian) 員工列表開關
  const toggleEmployeeListModal = () => setIsShowEmployeeListModal((prev) => !prev);
  // Info: (20250709 - Julian) 下拉選單開關
  const toggleYearDropdown = () => setIsYearOpen((prev) => !prev);
  const toggleMonthDropdown = () => setIsMonthOpen((prev) => !prev);

  // Info: (20250709 - Julian) input change handlers
  const handleEmployeeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    changeEmployeeName(e.target.value);
  };
  const handleEmployeeNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    changeEmployeeNumber(e.target.value);
  };

  const yearDropdown = yearOptions.map((year) => {
    const clickHandler = () => changeSelectedYear(year);
    return (
      <button
        type="button"
        onClick={clickHandler}
        className="px-12px py-10px text-left text-base font-medium text-input-text-input-filled hover:bg-input-surface-input-hover"
      >
        {year}
      </button>
    );
  });

  const monthDropdown = monthOptions.map((month) => {
    const clickHandler = () => changeSelectedMonth(month);
    return (
      <button
        type="button"
        onClick={clickHandler}
        className="px-12px py-10px text-left text-base font-medium text-input-text-input-filled hover:bg-input-surface-input-hover"
      >
        {month.name}
      </button>
    );
  });

  return (
    <>
      {/* Info: (20250711 - Julian) 員工基本資料表單 */}
      <form className="flex flex-col gap-24px">
        {/* Info: (20250708 - Julian) 員工姓名 */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            Employee Name <span className="text-text-state-error">*</span>
          </p>
          <div
            className={`flex h-44px items-center rounded-sm border bg-input-surface-input-background text-input-text-input-filled ${isNameError ? 'border-input-stroke-error' : 'border-input-stroke-input'}`}
          >
            <div
              className={`px-12px py-10px ${isNameError ? 'text-surface-state-error' : 'text-icon-surface-single-color-primary'}`}
            >
              <PiUserFill size={16} />
            </div>
            <input
              id="input-employee-name"
              name="input-employee-name"
              type="text"
              className={`flex-1 bg-transparent px-12px py-10px text-base font-medium ${isNameError ? 'placeholder:text-input-text-error' : 'placeholder:text-input-text-input-placeholder'}`}
              placeholder="Enter employee name"
              value={employeeName}
              onChange={handleEmployeeNameChange}
              required
            />
            <button
              type="button"
              onClick={toggleEmployeeListModal}
              className="flex h-full items-center gap-8px border-l border-input-stroke-input px-12px py-10px"
            >
              <FiSearch size={16} className="text-icon-surface-single-color-primary" />
              <p className="text-sm font-medium text-input-text-input-placeholder hover:text-input-text-input-hover">
                Employee List
              </p>
            </button>
          </div>
        </div>

        {/* Info: (20250708 - Julian) 員工編號 */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">Employee Number</p>
          <div className="flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
            <input
              id="input-employee-number"
              name="input-employee-number"
              type="text"
              className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
              placeholder="Enter employee number"
              value={employeeNumber}
              onChange={handleEmployeeNumberChange}
            />
          </div>
        </div>

        {/* Info: (20250708 - Julian) 年份 */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            Year <span className="text-text-state-error">*</span>
          </p>
          <div
            ref={yearDropdownRef}
            onClick={toggleYearDropdown}
            className="relative flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
          >
            <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled">
              {selectedYear}
            </div>
            <div className="px-12px py-10px">
              <FaChevronDown size={16} />
            </div>
            {isYearOpen && (
              <div className="absolute top-50px z-10 flex max-h-200px w-full flex-col overflow-hidden rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_XS">
                {yearDropdown}
              </div>
            )}
          </div>
        </div>

        {/* Info: (20250708 - Julian) 月份 */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            Month <span className="text-text-state-error">*</span>
          </p>
          <div
            ref={monthDropdownRef}
            onClick={toggleMonthDropdown}
            className="relative flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
          >
            <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled">
              {selectedMonth.name}
            </div>
            <div className="px-12px py-10px">
              <FaChevronDown size={16} />
            </div>
            {isMonthOpen && (
              <div className="absolute top-50px z-10 flex max-h-200px w-full flex-col overflow-y-auto rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_XS">
                {monthDropdown}
              </div>
            )}
          </div>
        </div>

        {/* Info: (20250708 - Julian) 工作天數 */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            Days Worked <span className="text-text-state-error">*</span>
          </p>
          <div className="flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
            <NumericInput
              id="input-worked-days"
              name="input-worked-days"
              value={workedDays}
              setValue={setWorkedDays}
              min={0}
              max={maxDaysInMonth}
              className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
              required
            />
          </div>
        </div>
      </form>

      {/* Info: (20250711 - Julian) 員工列表 Modal */}
      {isShowEmployeeListModal && (
        <EmployeeListModal modalVisibleHandler={toggleEmployeeListModal} />
      )}
    </>
  );
};

export default BasicInfoForm;
