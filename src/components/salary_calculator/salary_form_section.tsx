import React, { useState } from 'react';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FaChevronDown } from 'react-icons/fa6';
import { PiUserFill } from 'react-icons/pi';
import { MONTH_FULL_NAME } from '@/constants/display';
import ProgressBar from '@/components/salary_calculator/progress_bar';
import StepTabs from '@/components/salary_calculator/step_tabs';
import NumericInput from '@/components/numeric_input/numeric_input';
import { useCalculatorCtx } from '@/contexts/calculator_context';

const SalaryFormSection: React.FC = () => {
  const yearOptions = ['2025', '2024', '2023'];
  const monthOptions = MONTH_FULL_NAME;

  const { currentStep, employeeName, changeEmployeeName } = useCalculatorCtx();

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

  // Info: (20250708 - Julian) Form state
  //   const [employeeNameInput, setEmployeeNameInput] = useState<string>('');
  const [employeeNumberInput, setEmployeeNumberInput] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(yearOptions[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0]);
  const [workedDaysInput, setWorkedDaysInput] = useState<number>(31);

  // Info: (20250709 - Julian) 下拉選單開關
  const toggleYearDropdown = () => setIsYearOpen((prev) => !prev);
  const toggleMonthDropdown = () => setIsMonthOpen((prev) => !prev);

  // Info: (20250709 - Julian) input change handlers
  const handleEmployeeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    changeEmployeeName(e.target.value);
  };
  const handleEmployeeNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployeeNumberInput(e.target.value);
  };

  const yearDropdown = yearOptions.map((year) => {
    const clickHandler = () => setSelectedYear(year);
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
    const clickHandler = () => setSelectedMonth(month);
    return (
      <button
        type="button"
        onClick={clickHandler}
        className="px-12px py-10px text-left text-base font-medium text-input-text-input-filled hover:bg-input-surface-input-hover"
      >
        {month}
      </button>
    );
  });

  // Info: (20250709 - Julian) ================== 基本資訊表單 Basic Info Form ==================
  const basicInfoForm = (
    <form className="flex flex-col gap-24px">
      {/* Info: (20250708 - Julian) 員工姓名 */}
      <div className="flex flex-col gap-8px">
        <p className="text-sm font-semibold text-input-text-primary">
          Employee Name <span className="text-text-state-error">*</span>
        </p>
        <div className="flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
          <div className="px-12px py-10px text-icon-surface-single-color-primary">
            <PiUserFill size={16} />
          </div>
          <input
            type="text"
            className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
            placeholder="Enter employee name"
            value={employeeName}
            onChange={handleEmployeeNameChange}
          />
        </div>
      </div>

      {/* Info: (20250708 - Julian) 員工編號 */}
      <div className="flex flex-col gap-8px">
        <p className="text-sm font-semibold text-input-text-primary">Employee Number</p>
        <div className="flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
          <input
            type="text"
            className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
            placeholder="Enter employee number"
            value={employeeNumberInput}
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
            <div className="absolute top-50px flex w-full flex-col overflow-hidden rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_XS">
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
            {selectedMonth}
          </div>
          <div className="px-12px py-10px">
            <FaChevronDown size={16} />
          </div>
          {isMonthOpen && (
            <div className="absolute top-50px flex w-full flex-col overflow-hidden rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_XS">
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
            value={workedDaysInput}
            setValue={setWorkedDaysInput}
            min={0}
            max={31}
            className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
          />
        </div>
      </div>
    </form>
  );

  const displayedForm = currentStep === 1 ? basicInfoForm : null;

  return (
    <div className="flex flex-col gap-lv-8 p-80px">
      {/* Info: (20250708 - Julian) Progress bar */}
      <ProgressBar />
      {/* Info: (20250708 - Julian) Step Tabs */}
      <StepTabs />
      {/* Info: (20250709 - Julian) Form */}
      {displayedForm}
    </div>
  );
};

export default SalaryFormSection;
