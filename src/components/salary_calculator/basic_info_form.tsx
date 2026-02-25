"use client";

import React, { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import useOuterClick from "@/lib/hooks/use_outer_click";
import { ChevronDown, Search, User } from "lucide-react";
import EmployeeListModal from "@/components/salary_calculator/employee_list_modal";
import ToggleSwitch from "@/components/salary_calculator/toggle_switch";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import { useAuth } from "@/contexts/auth_context";
import {
  EmploymentType,
  TaxResidencyStatus,
} from "@/interfaces/salary_calculator";
import { INDUSTRY_CATEGORY_OPTIONS } from "@/constants/industry_category";

const BasicInfoForm: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [isShowEmployeeListModal, setIsShowEmployeeListModal] =
    useState<boolean>(false);

  const {
    yearOptions,
    monthOptions,
    employeeName,
    changeEmployeeName,
    employmentType,
    changeEmploymentType,
    taxResidencyStatus,
    changeTaxResidencyStatus,
    industryCategory,
    changeIndustryCategory,
    employeeNumber,
    changeEmployeeNumber,
    selectedYear,
    changeSelectedYear,
    selectedMonth,
    changeSelectedMonth,
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

  const isSignIn = !!user;

  const {
    targetRef: industryDropdownRef,
    componentVisible: isIndustryOpen,
    setComponentVisible: setIsIndustryOpen,
  } = useOuterClick<HTMLDivElement>(false);

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
  const selectedMonthNum =
    monthOptions.findIndex((month) => month.name === selectedMonth.name) + 1; // 月份從 1 開始計算
  const dateStr = `${selectedYear}/${selectedMonthNum < 10 ? `0${selectedMonthNum}` : selectedMonthNum}/`;

  // Info: (20250806 - Julian) 當月的最大天數
  const maxDaysInMonth = selectedMonth.days === 28 ? 29 : selectedMonth.days;
  // Info: (20250806 - Julian) 生成當月的天數選項
  const joiningDayOptions = Array.from(
    { length: maxDaysInMonth },
    (_, i) => i + 1,
  );
  // Info: (20250808 - Julian) 離職日應大於等於到職日，因此篩掉小於到職日的日期
  const leavingDayOptions = joiningDayOptions.filter((day) => {
    const joiningDay = parseInt(dayOfJoining, 10);
    return day >= joiningDay;
  });

  // Info: (20250711 - Julian) 員工列表開關
  const toggleEmployeeListModal = () =>
    setIsShowEmployeeListModal((prev) => !prev);
  // Info: (20250709 - Julian) 下拉選單開關
  const toggleIndustryDropdown = () => setIsIndustryOpen((prev) => !prev);
  const toggleYearDropdown = () => setIsYearOpen((prev) => !prev);
  const toggleMonthDropdown = () => setIsMonthOpen((prev) => !prev);
  const togglePayrollDropdown = () => setIsPayrollOpen((prev) => !prev);
  const toggleJoiningDayDropdown = () => setIsJoiningDayOpen((prev) => !prev);
  const toggleLeavingDayDropdown = () => setIsLeavingDayOpen((prev) => !prev);

  // Info: (20250709 - Julian) input change handlers
  const handleEmployeeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    changeEmployeeName(e.target.value);
  };
  const handleEmployeeNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    changeEmployeeNumber(e.target.value);
  };

  const employmentRadioBtn = Object.keys(EmploymentType).map((type) => {
    const isChecked =
      employmentType === EmploymentType[type as keyof typeof EmploymentType];
    const str = t(`calculator.basic_info_form.${type.toLowerCase()}`);
    const changeType = () =>
      changeEmploymentType(EmploymentType[type as keyof typeof EmploymentType]);

    return (
      <label
        key={`radio-${type}`}
        htmlFor={`radio-${type}`}
        className="flex h-44px items-center gap-8px"
      >
        <input
          id={`radio-${type}`}
          name="radio-employment-type"
          type="radio"
          checked={isChecked}
          onChange={changeType}
          className="relative h-16px w-16px appearance-none outline-none rounded-full border border-checkbox-stroke-unselected bg-white after:absolute after:left-1/2 after:top-1/2 after:-ml-5px after:-mt-5px after:hidden after:h-10px after:w-10px after:rounded-full after:bg-checkbox-stroke-unselected checked:after:block"
        />
        <p className="text-sm font-normal text-checkbox-text-primary">{str}</p>
      </label>
    );
  });

  const taxResidencyRadioBtn = Object.keys(TaxResidencyStatus).map((type) => {
    const isChecked =
      taxResidencyStatus ===
      TaxResidencyStatus[type as keyof typeof TaxResidencyStatus];
    const str = t(
      `calculator.basic_info_form.residency_option_${type.toLowerCase()}`,
    );
    const changeType = () =>
      changeTaxResidencyStatus(
        TaxResidencyStatus[type as keyof typeof TaxResidencyStatus],
      );

    return (
      <label
        key={`radio-${type}`}
        htmlFor={`radio-${type}`}
        className="flex h-44px items-center gap-8px"
      >
        <input
          id={`radio-${type}`}
          name="radio-tax-residency-status"
          type="radio"
          checked={isChecked}
          onChange={changeType}
          className="relative h-16px w-16px appearance-none outline-none rounded-full border border-checkbox-stroke-unselected bg-white after:absolute after:left-1/2 after:top-1/2 after:-ml-5px after:-mt-5px after:hidden after:h-10px after:w-10px after:rounded-full after:bg-checkbox-stroke-unselected checked:after:block"
        />
        <p className="text-sm font-normal text-checkbox-text-primary">{str}</p>
      </label>
    );
  });

  const industryDropdown = INDUSTRY_CATEGORY_OPTIONS.map((category) => {
    const clickHandler = () => changeIndustryCategory(category);
    return (
      <button
        key={category.CODE}
        type="button"
        onClick={clickHandler}
        className="px-12px py-10px text-left text-base font-medium text-input-text-input-filled hover:bg-input-surface-input-hover"
      >
        {category.CODE} - {category.INDUSTRY}
      </button>
    );
  });

  const yearDropdown = yearOptions.map((year) => {
    const clickHandler = () => changeSelectedYear(year);
    return (
      <button
        key={year}
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
    const monthName = t(
      `date.month_name.${month.name.slice(0, 3).toLowerCase()}`,
    );

    return (
      <button
        key={month.name}
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
        key={option}
        type="button"
        onClick={clickHandler}
        className="px-12px py-10px text-left text-base font-medium text-input-text-input-filled hover:bg-input-surface-input-hover"
      >
        {t(`calculator.basic_info_form.payroll_option_${option.toLowerCase()}`)}
      </button>
    );
  });

  const joiningDayDropdown = joiningDayOptions.map((day) => {
    const dayStr = day.toString().padStart(2, "0");
    const clickHandler = () => {
      changeJoinedDay(dayStr);
      // Info: (20250808 - Julian) 如果離職日小於到職日，則自動更新離職日
      if (!isLeft || parseInt(dayOfLeaving, 10) < day) {
        changeLeavingDay(dayStr);
      }
    };

    return (
      <button
        key={day}
        type="button"
        onClick={clickHandler}
        className="px-12px py-10px text-left text-base font-medium text-input-text-input-filled hover:bg-input-surface-input-hover"
      >
        {dayStr}
      </button>
    );
  });

  const leavingDayDropdown = leavingDayOptions.map((day) => {
    const dayStr = day.toString().padStart(2, "0");
    const clickHandler = () => changeLeavingDay(dayStr);

    return (
      <button
        key={day}
        type="button"
        onClick={clickHandler}
        className="px-12px py-10px text-left text-base font-medium text-input-text-input-filled hover:bg-input-surface-input-hover"
      >
        {dayStr}
      </button>
    );
  });

  return (
    <>
      {/* Info: (20250711 - Julian) 員工基本資料表單 */}
      <form className="grid grid-cols-2 gap-24px">
        {/* Info: (20250708 - Julian) 員工姓名 */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t("calculator.basic_info_form.employee_name")}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            className={`flex h-44px items-center rounded-sm border bg-input-surface-input-background text-input-text-input-filled ${isNameError ? "border-input-stroke-error" : "border-input-stroke-input"}`}
          >
            <div
              className={`px-12px py-10px ${isNameError ? "text-surface-state-error" : "text-icon-surface-single-color-primary"}`}
            >
              <User size={16} />
            </div>
            <input
              id="input-employee-name"
              name="input-employee-name"
              type="text"
              className={`flex-1 bg-transparent px-12px py-10px text-base font-medium outline-none ${isNameError ? "placeholder:text-input-text-error" : "placeholder:text-input-text-input-placeholder"}`}
              placeholder={t(
                "calculator.basic_info_form.employee_name_placeholder",
              )}
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
                <Search
                  size={16}
                  className="text-icon-surface-single-color-primary"
                />
                <p className="text-sm font-medium text-input-text-input-placeholder hover:text-input-text-input-hover">
                  {t("calculator.employee_list.main_title")}
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Info: (20251112 - Julian) 就業類型 */}
        <div className="flex items-end gap-36px">{employmentRadioBtn}</div>

        {/* Info: (20250708 - Julian) 員工編號 */}
        <div className="col-span-2 flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t("calculator.basic_info_form.employee_number")}
          </p>
          <div className="flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
            <input
              id="input-employee-number"
              name="input-employee-number"
              type="text"
              className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
              placeholder={t(
                "calculator.basic_info_form.employee_number_placeholder",
              )}
              value={employeeNumber}
              onChange={handleEmployeeNumberChange}
            />
          </div>
        </div>

        {/* Info: (20251112 - Julian) 稅務居住狀態 */}
        <div className="col-span-2 flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t("calculator.basic_info_form.tax_residency_status")}
            <span className="text-text-state-error">*</span>
          </p>
          <div className="flex items-end gap-36px">{taxResidencyRadioBtn}</div>
        </div>

        {/* Info: (20251112 - Julian) 行業別 */}
        <div className="col-span-2 flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t("calculator.basic_info_form.industry_category")}{" "}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            ref={industryDropdownRef}
            onClick={toggleIndustryDropdown}
            className="relative flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
          >
            <div className="flex-1 truncate bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled">
              {industryCategory.CODE} - {industryCategory.INDUSTRY}
            </div>
            <div className="px-12px py-10px">
              <ChevronDown size={16} />
            </div>
            {isIndustryOpen && (
              <div className="absolute top-50px z-10 flex max-h-200px w-full flex-col overflow-y-auto rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_XS">
                {industryDropdown}
              </div>
            )}
          </div>
        </div>

        {/* Info: (20250708 - Julian) 年份 */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t("calculator.basic_info_form.year")}{" "}
            <span className="text-text-state-error">*</span>
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
              <ChevronDown size={16} />
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
            {t("calculator.basic_info_form.month")}{" "}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            ref={monthDropdownRef}
            onClick={toggleMonthDropdown}
            className="relative flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
          >
            <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled">
              {t(
                `date.month_name.${selectedMonth.name.slice(0, 3).toLowerCase()}`,
              )}
            </div>
            <div className="px-12px py-10px">
              <ChevronDown size={16} />
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
            {t("calculator.basic_info_form.payroll_days_base")}{" "}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            ref={payrollDropdownRef}
            onClick={togglePayrollDropdown}
            className="relative flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
          >
            <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled">
              {t(
                `calculator.basic_info_form.payroll_option_${payrollDaysBase.toLowerCase()}`,
              )}
            </div>
            <div className="px-12px py-10px">
              <ChevronDown size={16} />
            </div>
            {isPayrollOpen && (
              <div className="absolute top-50px z-10 flex max-h-200px w-full flex-col overflow-y-auto rounded-sm border border-input-stroke-input bg-input-surface-input-background shadow-Dropshadow_XS">
                {payrollDropdown}
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-input-text-secondary">
            {t("calculator.basic_info_form.payroll_days_base_hint")}
          </p>
        </div>

        {/* Info: (20250806 - Julian) 到職日 */}
        <div className="col-span-2 flex flex-col items-start justify-between gap-x-40px gap-y-lv-3 tablet:h-44px tablet:flex-row tablet:items-center">
          <ToggleSwitch
            isOn={isJoined}
            handleToggle={toggleJoined}
            title={t("calculator.basic_info_form.joined_this_month_1")}
          />
          {isJoined && (
            <div className="flex items-center gap-8px">
              <p className="text-base font-medium">
                {t("calculator.basic_info_form.joined_this_month_2")} {dateStr}
              </p>
              <div
                ref={joiningDayRef}
                onClick={toggleJoiningDayDropdown}
                className="relative flex h-44px w-90px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
              >
                <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled">
                  {dayOfJoining}
                </div>
                <div className="px-12px py-10px">
                  <ChevronDown size={16} />
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
        <div className="col-span-2 flex flex-col items-start justify-between gap-x-40px gap-y-lv-3 tablet:h-44px tablet:flex-row tablet:items-center">
          <ToggleSwitch
            isOn={isLeft}
            handleToggle={toggleLeft}
            title={t("calculator.basic_info_form.left_this_month")}
          />
          {isLeft && (
            <div className="flex items-center gap-8px">
              <p className="text-base font-medium">
                {t("calculator.basic_info_form.joined_this_month_2")} {dateStr}
              </p>
              <div
                ref={leavingDayRef}
                onClick={toggleLeavingDayDropdown}
                className="relative flex h-44px w-90px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
              >
                <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled">
                  {dayOfLeaving}
                </div>
                <div className="px-12px py-10px">
                  <ChevronDown size={16} />
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
