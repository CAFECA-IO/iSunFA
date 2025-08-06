import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FaChevronDown } from 'react-icons/fa6';
import { FiSearch } from 'react-icons/fi';
import { PiUserFill } from 'react-icons/pi';
import EmployeeListModal from '@/components/salary_calculator/employee_list_modal';
import ToggleSwitch from '@/components/salary_calculator/toggle_switch';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import { useUserCtx } from '@/contexts/user_context';

const BasicInfoForm: React.FC = () => {
  const { t } = useTranslation(['calculator', 'date_picker']);

  const [isShowEmployeeListModal, setIsShowEmployeeListModal] = useState<boolean>(false);

  const {
    yearOptions,
    monthOptions,
    employeeName,
    changeEmployeeName,
    employeeNumber,
    changeEmployeeNumber,
    selectedYear,
    changeSelectedYear,
    selectedMonth,
    changeSelectedMonth,
    // workedDays,
    // setWorkedDays,
    isNameError,
    payrollDaysBaseOptions,
    payrollDaysBase,
    changePayrollDaysBase,
    isJoined,
    toggleJoined,
    dayOfJoining,
    changeJoinedDay,
    isLeft,
    toggleLeft,
    dayOfLeaving,
    changeLeavingDay,
  } = useCalculatorCtx();
  const { isSignIn } = useUserCtx();

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

  const {
    targetRef: payrollDropdownRef,
    componentVisible: isPayrollOpen,
    setComponentVisible: setIsPayrollOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: joiningDayRef,
    componentVisible: isJoiningDayOpen,
    setComponentVisible: setIsJoiningDayOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: leavingDayRef,
    componentVisible: isLeavingDayOpen,
    setComponentVisible: setIsLeavingDayOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20250806 - Julian) 生成日期字串
  const selectedMonthNum = monthOptions.findIndex((month) => month.name === selectedMonth.name) + 1; // 月份從 1 開始計算
  const dateStr = `${selectedYear}/${selectedMonthNum < 10 ? `0${selectedMonthNum}` : selectedMonthNum}/`;

  // Info: (20250806 - Julian) 當月的最大天數
  const maxDaysInMonth = selectedMonth.days === 28 ? 29 : selectedMonth.days;
  // Info: (20250806 - Julian) 生成當月的天數選項
  const dayOptions = Array.from({ length: maxDaysInMonth }, (_, i) =>
    (i + 1).toString().padStart(2, '0')
  );

  // Info: (20250711 - Julian) 員工列表開關
  const toggleEmployeeListModal = () => setIsShowEmployeeListModal((prev) => !prev);
  // Info: (20250709 - Julian) 下拉選單開關
  const toggleYearDropdown = () => setIsYearOpen((prev) => !prev);
  const toggleMonthDropdown = () => setIsMonthOpen((prev) => !prev);
  const togglePayrollDropdown = () => setIsPayrollOpen((prev) => !prev);
  const toggleJoiningDayDropdown = () => setIsJoiningDayOpen((prev) => !prev);
  const toggleLeavingDayDropdown = () => setIsLeavingDayOpen((prev) => !prev);

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
    const monthName = t(`date_picker:DATE_PICKER.${month.name.slice(0, 3).toUpperCase()}`);

    return (
      <button
        type="button"
        onClick={clickHandler}
        className="px-12px py-10px text-left text-base font-medium text-input-text-input-filled hover:bg-input-surface-input-hover"
      >
        {monthName}
      </button>
    );
  });

  const payrollDropdown = payrollDaysBaseOptions.map((option) => {
    const clickHandler = () => changePayrollDaysBase(option);

    return (
      <button
        type="button"
        onClick={clickHandler}
        className="px-12px py-10px text-left text-base font-medium text-input-text-input-filled hover:bg-input-surface-input-hover"
      >
        {t(`calculator:BASIC_INFO_FORM.PAYROLL_OPTION_${option}`)}
      </button>
    );
  });

  const joiningDayDropdown = dayOptions.map((day) => {
    const clickHandler = () => changeJoinedDay(day);

    return (
      <button
        type="button"
        onClick={clickHandler}
        className="px-12px py-10px text-left text-base font-medium text-input-text-input-filled hover:bg-input-surface-input-hover"
      >
        {day}
      </button>
    );
  });

  const leavingDayDropdown = dayOptions.map((day) => {
    const clickHandler = () => changeLeavingDay(day);

    return (
      <button
        type="button"
        onClick={clickHandler}
        className="px-12px py-10px text-left text-base font-medium text-input-text-input-filled hover:bg-input-surface-input-hover"
      >
        {day}
      </button>
    );
  });

  return (
    <>
      {/* Info: (20250711 - Julian) 員工基本資料表單 */}
      <form className="grid grid-cols-1 gap-24px tablet:grid-cols-2">
        {/* Info: (20250708 - Julian) 員工姓名 */}
        <div className="col-span-2 flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('calculator:BASIC_INFO_FORM.EMPLOYEE_NAME')}
            <span className="text-text-state-error">*</span>
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
              placeholder={t('calculator:BASIC_INFO_FORM.EMPLOYEE_NAME_PLACEHOLDER')}
              value={employeeName}
              onChange={handleEmployeeNameChange}
              required
            />
            {/* Info: (20250711 - Julian) 登入時才顯示員工列表按鈕 */}
            {isSignIn && (
              <button
                type="button"
                onClick={toggleEmployeeListModal}
                className="flex h-full items-center gap-8px border-l border-input-stroke-input px-12px py-10px"
              >
                <FiSearch size={16} className="text-icon-surface-single-color-primary" />
                <p className="text-sm font-medium text-input-text-input-placeholder hover:text-input-text-input-hover">
                  {t('calculator:EMPLOYEE_LIST.MAIN_TITLE')}
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Info: (20250708 - Julian) 員工編號 */}
        <div className="col-span-2 flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('calculator:BASIC_INFO_FORM.EMPLOYEE_NUMBER')}
          </p>
          <div className="flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
            <input
              id="input-employee-number"
              name="input-employee-number"
              type="text"
              className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
              placeholder={t('calculator:BASIC_INFO_FORM.EMPLOYEE_NUMBER_PLACEHOLDER')}
              value={employeeNumber}
              onChange={handleEmployeeNumberChange}
            />
          </div>
        </div>

        {/* Info: (20250708 - Julian) 年份 */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('calculator:BASIC_INFO_FORM.YEAR')} <span className="text-text-state-error">*</span>
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
              <div className="absolute top-50px z-10 flex max-h-200px w-full flex-col overflow-y-auto rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_XS">
                {yearDropdown}
              </div>
            )}
          </div>
        </div>

        {/* Info: (20250708 - Julian) 月份 */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('calculator:BASIC_INFO_FORM.MONTH')} <span className="text-text-state-error">*</span>
          </p>
          <div
            ref={monthDropdownRef}
            onClick={toggleMonthDropdown}
            className="relative flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
          >
            <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled">
              {t(`date_picker:DATE_PICKER.${selectedMonth.name.slice(0, 3).toUpperCase()}`)}
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

        {/* Info: (20250806 - Julian) 基準天數 */}
        <div className="col-span-2 flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('calculator:BASIC_INFO_FORM.PAYROLL_DAYS_BASE')}{' '}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            ref={payrollDropdownRef}
            onClick={togglePayrollDropdown}
            className="relative flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
          >
            <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled">
              {t(`calculator:BASIC_INFO_FORM.PAYROLL_OPTION_${payrollDaysBase}`)}
            </div>
            <div className="px-12px py-10px">
              <FaChevronDown size={16} />
            </div>
            {isPayrollOpen && (
              <div className="absolute top-50px z-10 flex max-h-200px w-full flex-col overflow-y-auto rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_XS">
                {payrollDropdown}
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-input-text-secondary">
            {t('calculator:BASIC_INFO_FORM.PAYROLL_DAYS_BASE_HINT')}
          </p>
        </div>

        {/* Info: (20250806 - Julian) 到職日 */}
        <div className="col-span-2 flex h-44px items-center justify-between gap-40px">
          <ToggleSwitch
            isOn={isJoined}
            handleToggle={toggleJoined}
            title={t('calculator:BASIC_INFO_FORM.JOINED_THIS_MONTH_1')}
          />
          {isJoined && (
            <div className="flex items-center gap-8px">
              <p className="text-base font-medium">
                {t('calculator:BASIC_INFO_FORM.JOINED_THIS_MONTH_2')} {dateStr}
              </p>
              <div
                ref={joiningDayRef}
                onClick={toggleJoiningDayDropdown}
                className="relative flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
              >
                <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled">
                  {dayOfJoining}
                </div>
                <div className="px-12px py-10px">
                  <FaChevronDown size={16} />
                </div>
                {isJoiningDayOpen && (
                  <div className="absolute top-50px z-10 flex max-h-100px w-full flex-col overflow-y-auto rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_XS">
                    {joiningDayDropdown}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info: (20250806 - Julian) 離職日 */}
        <div className="col-span-2 flex h-44px items-center justify-between gap-40px">
          <ToggleSwitch
            isOn={isLeft}
            handleToggle={toggleLeft}
            title={t('calculator:BASIC_INFO_FORM.LEFT_THIS_MONTH')}
          />
          {isLeft && (
            <div className="flex items-center gap-8px">
              <p className="text-base font-medium">
                {t('calculator:BASIC_INFO_FORM.JOINED_THIS_MONTH_2')} {dateStr}
              </p>
              <div
                ref={leavingDayRef}
                onClick={toggleLeavingDayDropdown}
                className="relative flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
              >
                <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled">
                  {dayOfLeaving}
                </div>
                <div className="px-12px py-10px">
                  <FaChevronDown size={16} />
                </div>
                {isLeavingDayOpen && (
                  <div className="absolute top-50px z-10 flex max-h-100px w-full flex-col overflow-y-auto rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_XS">
                    {leavingDayDropdown}
                  </div>
                )}
              </div>
            </div>
          )}
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
