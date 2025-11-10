import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import { haloStyle, orangeRadioStyle } from '@/constants/display';
import { IPreference } from '@/interfaces/resume';
import { useHiringCtx } from '@/contexts/hiring_context';

interface IPreferenceFormProps {
  toPrevStep: () => void;
  toNextStep: () => void;
}

interface ICheckOptionsProps {
  title: string;
  options: string[];
  currentOptions: string[];
  setCurrentOptions: React.Dispatch<React.SetStateAction<string[]>>;
  required?: boolean;
}

enum DateOption {
  IMMEDIATELY = 'Immediately',
  CUSTOM_DATE = 'Custom date',
}

enum DateUnit {
  DAY = 'Day',
  WEEK = 'Week',
  MONTH = 'Month',
  YEAR = 'Year',
}

enum SalaryOption {
  NEGOTIABLE = 'Negotiable',
  BY_COMPANY_POLICY = 'By company policy',
  PIECEWORK = 'Piecework',
  CUSTOM_SALARY = 'Custom salary',
}

enum SalaryUnit {
  HOUR = 'Hour',
  DAY = 'Day',
  WEEK = 'Week',
  MONTH = 'Month',
  YEAR = 'Year',
}

// Info: (20250506 - Julian) 勾選選項
const CheckOptions: React.FC<ICheckOptionsProps> = ({
  title,
  options,
  currentOptions,
  setCurrentOptions,
  required,
}) => {
  const { t } = useTranslation(['hiring']);

  const displayedOptions = options.map((opt) => {
    // Info: (20250430 - Julian) checkbox 樣式
    const orangeCheckboxStyle =
      'checked:after:content-orange relative h-16px w-16px appearance-none rounded-xxs border border-white after:absolute after:-left-1px after:-top-1px after:h-10px after:w-10px checked:border-surface-brand-primary-moderate checked:before:hidden checked:after:block hover:border-surface-brand-primary hover:bg-surface-brand-primary-30';

    // Info: (20250430 - Julian) 判斷選項是否被選中
    const isChecked = currentOptions.includes(opt);

    // Info: (20250502 - Julian) 轉換為 i18n Code
    const optStr = `hiring:PREFERENCE.OPTION_${opt.replaceAll(' ', '_').toUpperCase()}`;

    // Info: (20250502 - Julian) 變更選項狀態
    const handleChange = () => {
      if (isChecked) {
        // Info: (20250430 - Julian) 從 state 中移除選項
        setCurrentOptions((prev) => prev.filter((item) => item !== opt));
      } else {
        // Info: (20250430 - Julian) 將選項添加到 state 中
        setCurrentOptions((prev) => [...prev, opt]);
      }
    };

    return (
      <div key={opt} className="flex items-center gap-x-lv-2 text-sm font-medium">
        <input
          type="checkbox"
          id={opt}
          name={title}
          checked={isChecked}
          onChange={handleChange}
          className={orangeCheckboxStyle}
        />
        <label htmlFor={opt}>{t(optStr)}</label>
      </div>
    );
  });

  return (
    <div className="flex gap-x-50px">
      {/* Info: (20250430 - Julian) 項目 */}
      <p className="w-150px whitespace-nowrap text-base font-normal">
        {title}
        {required && <span className="ml-4px text-stroke-state-error">*</span>}
      </p>
      {/* Info: (20250430 - Julian) 選項 */}
      <div className="flex w-450px flex-wrap items-center gap-x-40px gap-y-16px">
        {displayedOptions}
      </div>
    </div>
  );
};

const PreferenceForm: React.FC<IPreferenceFormProps> = ({ toPrevStep, toNextStep }) => {
  const { t } = useTranslation(['hiring', 'common']);
  const { tempPreference, savePreference } = useHiringCtx();

  // Info: (20250430 - Julian) 定義選項
  const employmentTypes = ['Full Time', 'Part Time', 'Contract', 'Internship', 'Temporary'];
  const shifts = ['Morning Shift', 'Night Shift', 'Graveyard Shift', 'Shift Work'];
  const locationTypes = ['On Site', 'Hybrid', 'Remote'];
  const startDates = Object.values(DateOption);
  const salaryExpectations = Object.values(SalaryOption);

  // Info: (20250506 - Julian) 預設值
  const {
    employmentTypes: initialEmploymentTypes,
    shifts: initialShifts,
    locationTypes: initialLocationTypes,
    startDate: initialStartDate,
    salaryExpectation: initialSalaryExpectation,
  } = tempPreference || {
    employmentTypes: [],
    shifts: [],
    locationTypes: [],
    startDate: null,
    salaryExpectation: null,
  };

  // Info: (20250430 - Julian) 以 string array 的形式儲存選項
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] =
    useState<string[]>(initialEmploymentTypes);
  const [selectedShifts, setSelectedShifts] = useState<string[]>(initialShifts);
  const [selectedLocationTypes, setSelectedLocationTypes] =
    useState<string[]>(initialLocationTypes);
  // Info: (20250502 - Julian) 必選項目
  const [selectedStartDate, setSelectedStartDate] = useState<DateOption | null>(
    initialStartDate as DateOption
  );
  const [selectedSalary, setSelectedSalary] = useState<SalaryOption | null>(
    initialSalaryExpectation as SalaryOption
  );

  // Info: (20250430 - Julian) 自訂選項
  const [customDateInput, setCustomDateInput] = useState<number | null>(null);
  const [customDateUnits, setCustomDateUnits] = useState<DateUnit>(DateUnit.DAY);
  const [customSalaryInput, setCustomSalaryInput] = useState<string | null>(null);
  const [customSalaryUnits, setCustomSalaryUnits] = useState<SalaryUnit>(SalaryUnit.HOUR);

  // Info: (20250430 - Julian) 禁用按鈕
  const saveDisable =
    // Info: (20250502 - Julian) 未選擇 location types
    selectedLocationTypes.length < 1 ||
    // Info: (20250502 - Julian) 未選擇 start date
    selectedStartDate === null ||
    // Info: (20250502 - Julian) 未選擇 salary expectation
    selectedSalary === null ||
    // Info: (20250502 - Julian) 選擇 custom date 的狀況下輸入框為空
    (selectedStartDate === DateOption.CUSTOM_DATE && !customDateInput) ||
    // Info: (20250502 - Julian) 選擇 custom salary 的狀況下輸入框為空
    (selectedSalary === SalaryOption.CUSTOM_SALARY && !customSalaryInput);

  // Info: (20250502 - Julian) 送出表單
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!(selectedStartDate !== null && selectedSalary !== null)) return;
    event.preventDefault();

    const startDate =
      selectedStartDate === DateOption.CUSTOM_DATE
        ? `After ${customDateInput} ${customDateUnits}`
        : selectedStartDate;

    const salaryExpectation =
      selectedSalary === SalaryOption.CUSTOM_SALARY
        ? `${customSalaryInput} NTD per ${customSalaryUnits}`
        : selectedSalary;

    const formData: IPreference = {
      employmentTypes: selectedEmploymentTypes,
      shifts: selectedShifts,
      locationTypes: selectedLocationTypes,
      startDate,
      salaryExpectation,
    };

    // Info: (20250506 - Julian) 儲存表單資料
    savePreference(formData);

    // Info: (20250430 - Julian) 提交後跳轉到下一步
    toNextStep();
  };

  // Info: (20250502 - Julian) ============ 自訂日期相關 ============
  const changeCustomDateInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const numberValue = Number(value);
    setCustomDateInput(numberValue);

    // Info: (20250502 - Julian) 輸入時，自動選擇到「自訂日期」
    if (selectedStartDate !== DateOption.CUSTOM_DATE) {
      setSelectedStartDate(DateOption.CUSTOM_DATE as DateOption);
    }
  };
  const changeDateUnit = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setCustomDateUnits(value as DateUnit);

    // Info: (20250502 - Julian) 選擇時，自動選擇到「自訂日期」
    if (selectedStartDate !== DateOption.CUSTOM_DATE) {
      setSelectedStartDate(DateOption.CUSTOM_DATE as DateOption);
    }
  };

  // Info: (20250502 - Julian) ============ 自訂薪資相關 ============
  const changeCustomSalaryInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setCustomSalaryInput(value);

    // Info: (20250502 - Julian) 輸入時，自動選擇到「自訂薪資」
    if (selectedSalary !== SalaryOption.CUSTOM_SALARY) {
      setSelectedSalary(SalaryOption.CUSTOM_SALARY as SalaryOption);
    }
  };
  const changeSalaryUnit = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setCustomSalaryUnits(value as SalaryUnit);

    // Info: (20250502 - Julian) 選擇時，自動選擇到「自訂薪資」
    if (selectedSalary !== SalaryOption.CUSTOM_SALARY) {
      setSelectedSalary(SalaryOption.CUSTOM_SALARY as SalaryOption);
    }
  };

  // Info: (20250502 - Julian) 日期單位選項：天、週、月、年
  const customDateOptions = Object.values(DateUnit).map((unit) => (
    <option key={unit} value={unit}>
      {t(`hiring:PREFERENCE.DATE_UNIT_${unit.toUpperCase()}`)}
    </option>
  ));

  // Info: (20250502 - Julian) 自訂日期選項
  const customDateOption = (
    <div className="flex items-center gap-lv-2">
      {t('hiring:PREFERENCE.OPTION_CUSTOM_DATE_1')}{' '}
      <input
        type="number"
        id="custom-date"
        className="w-70px border-b bg-transparent text-center"
        value={customDateInput || ''}
        onChange={changeCustomDateInput}
      />
      {/* Info: (20250502 - Julian) 單位選擇 */}
      <div className="relative flex items-center">
        <select
          className={`${haloStyle} w-120px appearance-none rounded-full px-24px py-2px`}
          value={customDateUnits}
          onChange={changeDateUnit}
        >
          {customDateOptions}
        </select>
        <FaChevronDown className="absolute right-16px" />
      </div>
      {t('hiring:PREFERENCE.OPTION_CUSTOM_DATE_2')}
    </div>
  );

  // Info: (20250430 - Julian) 日期選項
  const startDateOptions = startDates.map((opt) => {
    const optionString =
      opt === DateOption.CUSTOM_DATE
        ? customDateOption
        : t(`hiring:PREFERENCE.OPTION_${opt.toUpperCase()}`);

    const onChange = () => {
      setSelectedStartDate(opt);
      // Info: (20250502 - Julian) 如果選擇「自訂日期」以外的選項，則清空輸入框
      if (opt !== DateOption.CUSTOM_DATE) {
        setCustomDateInput(null);
      }
    };

    return (
      <div key={opt} className="flex items-center gap-8px">
        <input
          type="radio"
          id={opt}
          name="start-date"
          checked={selectedStartDate === opt}
          className={orangeRadioStyle}
          onChange={onChange}
          required
        />
        <label htmlFor={opt}>{optionString}</label>
      </div>
    );
  });

  // Info: (20250502 - Julian) 薪資選項：時、天、週、月、年
  const customSalaryOptions = Object.values(SalaryUnit).map((unit) => (
    <option key={unit} value={unit}>
      {t(`hiring:PREFERENCE.SALARY_UNIT_${unit.toUpperCase()}`)}
    </option>
  ));

  // Info: (20250502 - Julian) 自訂薪資選項
  const customSalaryOption = (
    <div className="flex items-center gap-lv-2">
      {t('hiring:PREFERENCE.OPTION_CUSTOM_SALARY_1')}{' '}
      <input
        type="number"
        id="custom-salary"
        className="w-70px border-b bg-transparent text-center"
        value={customSalaryInput || ''}
        onChange={changeCustomSalaryInput}
      />
      {t('hiring:PREFERENCE.OPTION_CUSTOM_SALARY_2')}
      {/* Info: (20250502 - Julian) 單位選擇 */}
      <div className="relative flex items-center">
        <select
          className={`${haloStyle} w-120px appearance-none rounded-full px-24px py-2px`}
          value={customSalaryUnits}
          onChange={changeSalaryUnit}
        >
          {customSalaryOptions}
        </select>
        <FaChevronDown className="absolute right-16px" />
      </div>
    </div>
  );

  // Info: (20250430 - Julian) 薪資選項
  const salaryOptions = salaryExpectations.map((opt) => {
    const optionString =
      opt === SalaryOption.CUSTOM_SALARY
        ? customSalaryOption
        : t(`hiring:PREFERENCE.OPTION_${opt.replaceAll(' ', '_').toUpperCase()}`);

    const onChange = () => {
      setSelectedSalary(opt);
      // Info: (20250502 - Julian) 如果選擇「自訂薪資」以外的選項，則清空輸入框
      if (opt !== SalaryOption.CUSTOM_SALARY) {
        setCustomSalaryInput(null);
      }
    };
    return (
      <div key={opt} className="flex items-center gap-8px">
        <input
          type="radio"
          id={opt}
          name="salary"
          checked={selectedSalary === opt}
          className={orangeRadioStyle}
          onChange={onChange}
          required
        />
        <label htmlFor={opt}>{optionString}</label>
      </div>
    );
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Info: (20250430 - Julian) Preference Form */}
      <div className="flex flex-col gap-lv-7">
        {/* Info: (20250430 - Julian) Employment types */}
        <CheckOptions
          title={t('hiring:PREFERENCE.EMPLOYMENT_TYPES')}
          options={employmentTypes}
          currentOptions={selectedEmploymentTypes}
          setCurrentOptions={setSelectedEmploymentTypes}
        />

        {/* Info: (20250430 - Julian) Shifts */}
        <CheckOptions
          title={t('hiring:PREFERENCE.SHIFT')}
          options={shifts}
          currentOptions={selectedShifts}
          setCurrentOptions={setSelectedShifts}
        />

        {/* Info: (20250430 - Julian) Location Types */}
        <CheckOptions
          title={t('hiring:PREFERENCE.LOCATION_TYPE')}
          options={locationTypes}
          currentOptions={selectedLocationTypes}
          setCurrentOptions={setSelectedLocationTypes}
          required
        />

        {/* Info: (20250430 - Julian) Start Date */}
        <div className="flex gap-x-50px">
          {/* Info: (20250430 - Julian) 項目 */}
          <p className="w-150px whitespace-nowrap text-base font-normal">
            {t('hiring:PREFERENCE.START_DATE')}
            <span className="ml-4px text-stroke-state-error">*</span>
          </p>
          {/* Info: (20250430 - Julian) 選項 */}
          <div className="flex w-450px flex-wrap items-center gap-x-40px gap-y-16px">
            {startDateOptions}
          </div>
        </div>

        {/* Info: (20250430 - Julian) Salary Expectation */}
        <div className="flex gap-x-50px">
          {/* Info: (20250430 - Julian) 項目 */}
          <p className="w-150px whitespace-nowrap text-base font-normal">
            {t('hiring:PREFERENCE.SALARY_EXPECTATION')}
            <span className="ml-4px text-stroke-state-error">*</span>
          </p>
          {/* Info: (20250430 - Julian) 選項 */}
          <div className="flex w-450px flex-wrap items-center gap-x-40px gap-y-16px">
            {salaryOptions}
          </div>
        </div>
      </div>

      <div className="ml-auto mt-70px flex items-center gap-lv-6">
        {/* Info: (20250430 - Julian) Back Button */}
        <LandingButton variant="default" className="font-bold" onClick={toPrevStep}>
          {t('hiring:COMMON.PREVIOUS')}
        </LandingButton>

        {/* Info: (20250430 - Julian) Next Button */}
        <LandingButton type="submit" variant="primary" className="font-bold" disabled={saveDisable}>
          {t('hiring:COMMON.NEXT')}
        </LandingButton>
      </div>
    </form>
  );
};

export default PreferenceForm;
