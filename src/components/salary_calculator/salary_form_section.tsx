import React, { useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FaChevronDown } from 'react-icons/fa6';
import { PiUserFill } from 'react-icons/pi';
import ProgressBar from '@/components/salary_calculator/progress_bar';
import StepTabs from '@/components/salary_calculator/step_tabs';

// ToDo: (20250708 - Julian) Develop dropdown menu

const SalaryFormSection: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  // Info: (20250708 - Julian) Form state
  const [employeeNameInput, setEmployeeNameInput] = useState<string>('');
  const [employeeNumberInput, setEmployeeNumberInput] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedMonth, setSelectedMonth] = useState<string>('January');
  const [workedDaysInput, setWorkedDaysInput] = useState<number>(31);

  const handleEmployeeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployeeNameInput(e.target.value);
  };
  const handleEmployeeNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployeeNumberInput(e.target.value);
  };
  const handleWorkedDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setWorkedDaysInput(value ? parseInt(value, 10) : 0);
  };

  // Info: (20250708 - Julian) 總共四個步驟，每個步驟佔 25% 的進度
  const progress = currentStep * 25;

  // ToDo: (20250708 - Julian) During development
  const resetHandler = () => {
    setCurrentStep(1);
  };

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
            value={employeeNameInput}
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
        <div className="flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer">
          <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder">
            {selectedYear}
          </div>
          <div className="px-12px py-10px">
            <FaChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* Info: (20250708 - Julian) 月份 */}
      <div className="flex flex-col gap-8px">
        <p className="text-sm font-semibold text-input-text-primary">
          Month <span className="text-text-state-error">*</span>
        </p>
        <div className="flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer">
          <div className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder">
            {selectedMonth}
          </div>
          <div className="px-12px py-10px">
            <FaChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* Info: (20250708 - Julian) 工作天數 */}
      <div className="flex flex-col gap-8px">
        <p className="text-sm font-semibold text-input-text-primary">
          Days Worked <span className="text-text-state-error">*</span>
        </p>
        <div className="flex h-44px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
          <input
            type="number"
            className="flex-1 bg-transparent px-12px py-10px text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
            value={workedDaysInput}
            onChange={handleWorkedDaysChange}
          />
        </div>
      </div>
    </form>
  );

  return (
    <div className="flex flex-col gap-lv-8 p-80px">
      {/* Info: (20250708 - Julian) Progress bar */}
      <ProgressBar progress={progress} resetHandler={resetHandler} />
      {/* Info: (20250708 - Julian) Step Tabs */}
      <StepTabs currentStep={currentStep} />
      {/* Info: (20250708 - Julian) Form */}
      {basicInfoForm}
    </div>
  );
};

export default SalaryFormSection;
