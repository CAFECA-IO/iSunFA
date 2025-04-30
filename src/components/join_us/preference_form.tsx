import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { haloStyle, orangeRadioStyle } from '@/constants/display';

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

const CheckOptions: React.FC<ICheckOptionsProps> = ({
  title,
  options,
  currentOptions,
  setCurrentOptions,
  required,
}) => {
  const displayedOptions = options.map((opt) => {
    // Info: (20250430 - Julian) checkbox 樣式
    const orangeCheckboxStyle =
      'checked:after:content-orange relative h-16px w-16px appearance-none rounded-xxs border border-white after:absolute after:-left-1px after:-top-2px after:h-10px after:w-10px checked:border-surface-brand-primary-moderate checked:before:hidden checked:after:block hover:border-surface-brand-primary hover:bg-surface-brand-primary-30';

    // Info: (20250430 - Julian) 判斷選項是否被選中
    const isChecked = currentOptions.includes(opt);

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
          required={required}
        />
        <label htmlFor={opt}>{opt}</label>
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PreferenceForm: React.FC<IPreferenceFormProps> = ({ toPrevStep, toNextStep }) => {
  const { t } = useTranslation(['hiring']);

  // Info: (20250430 - Julian) 定義選項
  const employmentTypes = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Temporary'];
  const shifts = ['Morning Shift', 'Night Shift', 'Graveyard Shift', 'Shift Work'];
  const locationTypes = ['On Site', 'Hybrid', 'Remote'];
  const startDates = ['Immediately', 'Custom date'];
  const salaryExpectations = ['Negotiable', 'By Company Policy', 'Piecework', 'Custom salary'];

  // Info: (20250430 - Julian) 以 string array 的形式儲存選項
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [selectedLocationTypes, setSelectedLocationTypes] = useState<string[]>([]);
  const [selectedStartDate, setSelectedStartDate] = useState<string>('');
  const [selectedSalary, setSelectedSalary] = useState<string>('');

  // Info: (20250430 - Julian) 自訂選項
  const [customDateInput, setCustomDateInput] = useState<number | null>(null);
  //   const [customDateUnits, setCustomDateUnits] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Day');
  //   const [customSalaryInput, setCustomSalaryInput] = useState<string>('');
  //   const [customSalaryUnits, setCustomSalaryUnits] = useState<
  //     'Hour' | 'Day' | 'Week' | 'Month' | 'Year'
  //   >('Hour');

  // Info: (20250430 - Julian) 禁用按鈕：未選擇 location types
  const saveDisable = selectedLocationTypes.length < 1;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    // ToDo: (20250430 - Julian) 在這裡可以處理表單提交的邏輯
    const formData = {
      employmentTypes: selectedEmploymentTypes,
      shifts: selectedShifts,
      locationTypes: selectedLocationTypes,
      startDate: selectedStartDate,
      salary: selectedSalary,
    };
    // eslint-disable-next-line no-console
    console.log('Form submitted:', formData);

    // Info: (20250430 - Julian) 提交後跳轉到下一步
    // toNextStep();
  };

  const changeCustomDateInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const numberValue = Number(value);
    setCustomDateInput(numberValue);
  };

  // ToDo: (20250430 - Julian) during development, add unit select
  const customDateOption = (
    <div className="flex items-center gap-lv-2">
      After...{' '}
      <input
        type="number"
        id="custom-date"
        className="w-70px border-b bg-transparent text-center"
        value={customDateInput || ''}
        onChange={changeCustomDateInput}
      />
    </div>
  );

  // Info: (20250430 - Julian) 日期選項
  const startDateOptions = startDates.map((opt) => {
    const optionString = opt === 'Custom date' ? customDateOption : opt;

    return (
      <div className="flex items-center gap-8px">
        <input
          type="radio"
          id={opt}
          name="start-date"
          checked={selectedStartDate === opt}
          className={orangeRadioStyle}
          onChange={() => setSelectedStartDate(opt)}
          required
        />
        <label htmlFor={opt}>{optionString}</label>
      </div>
    );
  });

  // Info: (20250430 - Julian) 薪資選項
  // ToDo: (20250430 - Julian) during development, add custom salary input
  const salaryOptions = salaryExpectations.map((opt) => {
    return (
      <div className="flex items-center gap-8px">
        <input
          type="radio"
          id={opt}
          name="salary"
          checked={selectedSalary === opt}
          className={orangeRadioStyle}
          onChange={() => setSelectedSalary(opt)}
          required
        />
        <label htmlFor={opt}>{opt}</label>
      </div>
    );
  });

  return (
    <div className="flex flex-col">
      {/* Info: (20250430 - Julian) Preference Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-lv-7">
        {/* Info: (20250430 - Julian) Employment types */}
        <CheckOptions
          title="Employment Types"
          options={employmentTypes}
          currentOptions={selectedEmploymentTypes}
          setCurrentOptions={setSelectedEmploymentTypes}
        />

        {/* Info: (20250430 - Julian) Shifts */}
        <CheckOptions
          title="Shift"
          options={shifts}
          currentOptions={selectedShifts}
          setCurrentOptions={setSelectedShifts}
        />

        {/* Info: (20250430 - Julian) Location Types */}
        <CheckOptions
          title="Location Type"
          options={locationTypes}
          currentOptions={selectedLocationTypes}
          setCurrentOptions={setSelectedLocationTypes}
          required
        />

        {/* Info: (20250430 - Julian) Start Date */}
        <div className="flex gap-x-50px">
          {/* Info: (20250430 - Julian) 項目 */}
          <p className="w-150px whitespace-nowrap text-base font-normal">
            Start date
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
            Salary Expectation
            <span className="ml-4px text-stroke-state-error">*</span>
          </p>
          {/* Info: (20250430 - Julian) 選項 */}
          <div className="flex w-450px flex-wrap items-center gap-x-40px gap-y-16px">
            {salaryOptions}
          </div>
        </div>
      </form>

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
    </div>
  );
};

export default PreferenceForm;
