"use client";

import React, { useState, Fragment } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
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

  // Info: (20250806 - Julian) 生成日期字串
  const selectedMonthNum =
    monthOptions.findIndex((month) => month.name === selectedMonth.name) + 1;
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
        key={`employment-${type}`}
        htmlFor={`employment-${type}`}
        className="flex cursor-pointer items-center gap-2 py-2"
      >
        <div className="relative flex items-center justify-center">
          <input
            id={`employment-${type}`}
            name="radio-employment-type"
            type="radio"
            aria-label={str}
            checked={isChecked}
            onChange={changeType}
            className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-gray-300 bg-white transition-all checked:border-orange-400 outline-none"
          />
          <div className="absolute h-2.5 w-2.5 scale-0 rounded-full bg-orange-400 transition-transform peer-checked:scale-100" />
        </div>
        <p className="text-sm font-medium text-gray-700">{str}</p>
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
        key={`tax-residency-${type}`}
        htmlFor={`tax-residency-${type}`}
        className="flex cursor-pointer items-center gap-2 py-2"
      >
        <div className="relative flex items-center justify-center">
          <input
            id={`tax-residency-${type}`}
            name="radio-tax-residency-status"
            type="radio"
            aria-label={str}
            checked={isChecked}
            onChange={changeType}
            className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-gray-300 bg-white transition-all checked:border-orange-400 outline-none"
          />
          <div className="absolute h-2.5 w-2.5 scale-0 rounded-full bg-orange-400 transition-transform peer-checked:scale-100" />
        </div>
        <p className="text-sm font-medium text-gray-700">{str}</p>
      </label>
    );
  });

  const handleJoinedDayChange = (dayStr: string) => {
    changeJoinedDay(dayStr);
    // Info: (20250808 - Julian) 如果離職日小於到職日，則自動更新離職日
    const day = parseInt(dayStr, 10);
    if (!isLeft || parseInt(dayOfLeaving, 10) < day) {
      changeLeavingDay(dayStr);
    }
  };

  return (
    <>
      {/* Info: (20250711 - Julian) 員工基本資料表單 */}
      <form className="grid grid-cols-2 gap-x-8 gap-y-6">
        {/* Info: (20250708 - Julian) 員工姓名 & 就業類型 */}
        <div className="col-span-2 flex items-end gap-8">
          <div className="flex flex-col gap-2 flex-1">
            <label
              htmlFor="input-employee-name"
              className="text-sm font-bold text-gray-700"
            >
              {t("calculator.basic_info_form.employee_name")}
              <span className="text-red-500">*</span>
            </label>
            <div
              className={`flex h-44px items-center rounded-lg bg-white ring-2 transition-all ${isNameError
                  ? " ring-red-300 focus-within:ring-orange-300"
                  : " ring-gray-200 focus-within:ring-orange-300"
                }`}
            >
              <div
                className={`pl-3 pr-1 py-2 ${isNameError ? "text-red-500" : "text-gray-400"}`}
              >
                <User size={16} />
              </div>
              <input
                id="input-employee-name"
                name="input-employee-name"
                type="text"
                aria-label={t("calculator.basic_info_form.employee_name")}
                className={`flex-1 bg-transparent px-3 py-2 text-sm font-medium text-gray-900 border-gray-200 border-r outline-none placeholder:text-gray-400`}
                placeholder={t(
                  "calculator.basic_info_form.employee_name_placeholder",
                )}
                value={employeeName}
                onChange={handleEmployeeNameChange}
                required
              />
              {/* Info: (20250711 - Julian) 登入時才顯示員工列表按鈕，暫時關閉此功能 */}
              {isSignIn && false && (
                <button
                  type="button"
                  onClick={toggleEmployeeListModal}
                  className="flex h-full items-center gap-2 text-gray-700 hover:text-orange-600 px-4 py-2 transition-colors"
                >
                  <Search size={16} className="text-gray-400" />
                  <p className="text-xs font-semibold">
                    {t("calculator.employee_list.main_title")}
                  </p>
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
            {employmentRadioBtn}
          </div>
        </div>
        {/* Info: (20250708 - Julian) 員工編號 */}
        <div className="col-span-2 flex flex-col gap-2">
          <label
            htmlFor="input-employee-number"
            className="text-sm font-bold text-gray-700"
          >
            {t("calculator.basic_info_form.employee_number")}
          </label>
          <div className="flex h-44px items-center rounded-lg bg-white ring-2 ring-gray-200 transition-all focus-within:ring-orange-300">
            <input
              id="input-employee-number"
              name="input-employee-number"
              type="text"
              aria-label={t("calculator.basic_info_form.employee_number")}
              className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
              placeholder={t(
                "calculator.basic_info_form.employee_number_placeholder",
              )}
              value={employeeNumber}
              onChange={handleEmployeeNumberChange}
            />
          </div>
        </div>

        {/* Info: (20251112 - Julian) 稅務居住狀態 */}
        <div className="col-span-2 flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">
            {t("calculator.basic_info_form.tax_residency_status")}
            <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
            {taxResidencyRadioBtn}
          </div>
        </div>

        {/* Info: (20251112 - Julian) 行業別 */}
        <div className="col-span-2 flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">
            {t("calculator.basic_info_form.industry_category")}{" "}
            <span className="text-red-500">*</span>
          </p>
          <Listbox value={industryCategory} onChange={changeIndustryCategory}>
            <div className="relative">
              <ListboxButton className="flex w-full h-44px items-center rounded-lg bg-white ring-2 ring-gray-200 transition-all hover:ring-orange-300 focus:outline-none data-open:ring-orange-300">
                <div className="flex-1 truncate bg-transparent px-3 py-2 text-sm font-medium text-gray-900 text-left">
                  {industryCategory.CODE} - {industryCategory.INDUSTRY}
                </div>
                <div className="px-3 py-2 text-gray-400">
                  <ChevronDown size={16} />
                </div>
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute top-[calc(100%+8px)] z-50 flex max-h-60 w-full flex-col overflow-y-auto rounded-xl border border-gray-300 bg-white py-2 shadow-2xl focus:outline-none">
                  {INDUSTRY_CATEGORY_OPTIONS.map((category) => (
                    <ListboxOption
                      key={category.CODE}
                      value={category}
                      className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-900 data-selected:bg-orange-50 data-selected:text-orange-900"
                    >
                      <span className="font-bold text-orange-600">{category.CODE}</span> -{" "}
                      {category.INDUSTRY}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
        </div>

        {/* Info: (20250708 - Julian) 年份 */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">
            {t("calculator.basic_info_form.year")}{" "}
            <span className="text-red-500">*</span>
          </p>
          <Listbox value={selectedYear} onChange={changeSelectedYear}>
            <div className="relative">
              <ListboxButton className="flex w-full h-44px items-center rounded-lg bg-white ring-2 ring-gray-200 transition-all hover:ring-orange-300 focus:outline-none data-open:ring-orange-300">
                <div className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-gray-900 text-left">
                  {selectedYear}
                </div>
                <div className="px-3 py-2 text-gray-400">
                  <ChevronDown size={16} />
                </div>
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute top-[calc(100%+8px)] z-50 flex max-h-60 w-full flex-col overflow-y-auto rounded-xl border border-gray-300 bg-white py-2 shadow-2xl focus:outline-none">
                  {yearOptions.map((year) => (
                    <ListboxOption
                      key={year}
                      value={year}
                      className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-900 data-selected:bg-orange-50 data-selected:text-orange-900"
                    >
                      {year}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
        </div>

        {/* Info: (20250708 - Julian) 月份 */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">
            {t("calculator.basic_info_form.month")}{" "}
            <span className="text-red-500">*</span>
          </p>
          <Listbox value={selectedMonth} onChange={changeSelectedMonth}>
            <div className="relative">
              <ListboxButton className="flex w-full h-44px items-center rounded-lg bg-white ring-2 ring-gray-200 transition-all hover:ring-orange-300 focus:outline-none data-open:ring-orange-300">
                <div className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-gray-900 text-left">
                  {t(`date.month_name.${selectedMonth.name.slice(0, 3).toLowerCase()}`)}
                </div>
                <div className="px-3 py-2 text-gray-400">
                  <ChevronDown size={16} />
                </div>
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute top-[calc(100%+8px)] z-50 flex max-h-60 w-full flex-col overflow-y-auto rounded-xl border border-gray-300 bg-white py-2 shadow-2xl focus:outline-none">
                  {monthOptions.map((month) => (
                    <ListboxOption
                      key={month.name}
                      value={month}
                      className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-900 data-selected:bg-orange-50 data-selected:text-orange-900"
                    >
                      {t(`date.month_name.${month.name.slice(0, 3).toLowerCase()}`)}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
        </div>

        {/* Info: (20250806 - Julian) 基準天數 */}
        <div className="col-span-2 flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">
            {t("calculator.basic_info_form.payroll_days_base")}{" "}
            <span className="text-red-500">*</span>
          </p>
          <Listbox value={payrollDaysBase} onChange={changePayrollDaysBase}>
            <div className="relative">
              <ListboxButton className="flex w-full h-44px items-center rounded-lg bg-white ring-2 ring-gray-200 transition-all hover:ring-orange-300 focus:outline-none data-open:ring-orange-300">
                <div className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-gray-900 text-left">
                  {t(`calculator.basic_info_form.payroll_option_${payrollDaysBase.toLowerCase()}`)}
                </div>
                <div className="px-3 py-2 text-gray-400">
                  <ChevronDown size={16} />
                </div>
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute top-[calc(100%+8px)] z-50 flex max-h-60 w-full flex-col overflow-y-auto rounded-xl border border-gray-300 bg-white py-2 shadow-2xl focus:outline-none">
                  {payrollDaysBaseOptions.map((option) => (
                    <ListboxOption
                      key={option}
                      value={option}
                      className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-900 data-selected:bg-orange-50 data-selected:text-orange-900"
                    >
                      {t(`calculator.basic_info_form.payroll_option_${option.toLowerCase()}`)}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
          <p className="text-xs font-medium text-gray-500 pl-1">
            {t("calculator.basic_info_form.payroll_days_base_hint")}
          </p>
        </div>

        {/* Info: (20250806 - Julian) 到職日 */}
        <div className="col-span-2 flex flex-col items-start justify-between gap-x-40px gap-y-lv-3 sm:h-10 sm:flex-row sm:items-center">
          <ToggleSwitch
            isOn={isJoined}
            handleToggle={toggleJoined}
            title={t("calculator.basic_info_form.joined_this_month_1")}
          />
          {isJoined && (
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-700">
                {t("calculator.basic_info_form.joined_this_month_2")} {dateStr}
              </p>
              <Listbox value={dayOfJoining} onChange={handleJoinedDayChange}>
                <div className="relative">
                  <ListboxButton className="flex h-44px w-90px items-center rounded-lg bg-white ring-2 ring-gray-200 transition-all hover:ring-orange-300 focus:outline-none data-open:ring-orange-300">
                    <div className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-gray-900 text-left">
                      {dayOfJoining}
                    </div>
                    <div className="px-3 py-2 text-gray-400">
                      <ChevronDown size={16} />
                    </div>
                  </ListboxButton>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <ListboxOptions className="absolute top-[calc(100%+8px)] z-50 grid max-h-40 w-max grid-cols-7 gap-1 overflow-y-auto rounded-xl border border-gray-300 bg-white p-2 shadow-2xl focus:outline-none">
                      {joiningDayOptions.map((day) => {
                        const dayStr = day.toString().padStart(2, "0");
                        return (
                          <ListboxOption
                            key={day}
                            value={dayStr}
                            className="cursor-pointer rounded-lg px-2 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-900 data-selected:bg-orange-50 data-selected:text-orange-900"
                          >
                            {dayStr}
                          </ListboxOption>
                        );
                      })}
                    </ListboxOptions>
                  </Transition>
                </div>
              </Listbox>
            </div>
          )}
        </div>

        {/* Info: (20250806 - Julian) 離職日 */}
        <div className="col-span-2 flex flex-col items-start justify-between gap-x-40px gap-y-lv-3 sm:h-10 sm:flex-row sm:items-center">
          <ToggleSwitch
            isOn={isLeft}
            handleToggle={toggleLeft}
            title={t("calculator.basic_info_form.left_this_month")}
          />
          {isLeft && (
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-700">
                {t("calculator.basic_info_form.joined_this_month_2")} {dateStr}
              </p>
              <Listbox value={dayOfLeaving} onChange={changeLeavingDay}>
                <div className="relative">
                  <ListboxButton className="flex h-44px w-90px items-center rounded-lg bg-white ring-2 ring-gray-200 transition-all hover:ring-orange-300 focus:outline-none data-open:ring-orange-300">
                    <div className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-gray-900 text-left">
                      {dayOfLeaving}
                    </div>
                    <div className="px-3 py-2 text-gray-400">
                      <ChevronDown size={16} />
                    </div>
                  </ListboxButton>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <ListboxOptions className="absolute top-[calc(100%+8px)] z-50 grid max-h-40 w-max grid-cols-7 gap-1 overflow-y-auto rounded-xl border border-gray-300 bg-white p-2 shadow-2xl focus:outline-none">
                      {leavingDayOptions.map((day) => {
                        const dayStr = day.toString().padStart(2, "0");
                        return (
                          <ListboxOption
                            key={day}
                            value={dayStr}
                            className="cursor-pointer rounded-lg px-2 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-900 data-selected:bg-orange-50 data-selected:text-orange-900"
                          >
                            {dayStr}
                          </ListboxOption>
                        );
                      })}
                    </ListboxOptions>
                  </Transition>
                </div>
              </Listbox>
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
