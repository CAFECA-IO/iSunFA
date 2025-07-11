import React from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa6';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import NumericInput from '@/components/numeric_input/numeric_input';

const MIN_HOURS = 0;
const MAX_HOURS = 99;

// Info: (20250709 - Julian) 時數計數器
const HourCounter: React.FC<{
  title: string;
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
}> = ({ title, value, setValue }) => {
  const minusDisabled = value <= MIN_HOURS;
  const plusDisabled = value >= MAX_HOURS;

  const minusClickHandler = () => setValue((prev) => prev - 1);
  const plusClickHandler = () => setValue((prev) => prev + 1);

  return (
    <div className="flex flex-col gap-8px">
      <p className="text-sm font-semibold text-input-text-primary">{title}</p>
      <div className="flex w-full items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
        <button
          type="button"
          disabled={minusDisabled}
          onClick={minusClickHandler}
          className="h-full px-12px py-10px text-icon-surface-single-color-primary disabled:text-icon-surface-single-color-tertiary"
        >
          <FaMinus size={16} />
        </button>
        <NumericInput
          value={value}
          setValue={setValue}
          min={MIN_HOURS}
          max={MAX_HOURS}
          className="w-80px flex-1 bg-transparent px-12px py-10px text-center font-medium text-input-text-input-filled"
        />
        <button
          type="button"
          disabled={plusDisabled}
          onClick={plusClickHandler}
          className="h-full px-12px py-10px text-icon-surface-single-color-primary disabled:text-icon-surface-single-color-tertiary"
        >
          <FaPlus size={16} />
        </button>
      </div>
    </div>
  );
};

const TotalHours: React.FC<{
  title: string;
  totalHours: number;
}> = ({ title, totalHours }) => {
  return (
    <div className="flex flex-col gap-8px">
      <p className="text-sm font-semibold text-input-text-primary">{title}</p>
      <div className="flex w-full items-center rounded-sm bg-surface-brand-primary-10 px-12px py-10px">
        {totalHours}
      </div>
    </div>
  );
};

const WorkHoursForm: React.FC = () => {
  const {
    // Info: (20250709 - Julian) overtime hour state
    oneHours,
    setOneHours,
    oneAndOneThirdHours,
    setOneAndOneThirdHours,
    oneAndTwoThirdsHours,
    setOneAndTwoThirdsHours,
    twoHours,
    setTwoHours,
    twoAndTwoThirdsHours,
    setTwoAndTwoThirdsHours,
    // Info: (20250709 - Julian) leave hour state
    sickLeaveHours,
    setSickLeaveHours,
    personalLeaveHours,
    setPersonalLeaveHours,
    totalOvertimeHours,
    totalLeaveHours,
  } = useCalculatorCtx();

  return (
    <form className="flex flex-col gap-lv-8">
      {/* Info: (20250709 - Julian) 加班時數 */}
      <h2 className="text-lg font-bold text-text-brand-secondary-lv1">Overtime Hour</h2>
      <div className="grid grid-cols-3 gap-24px">
        {/* Info: (20250709 - Julian) 1 小時 */}
        <HourCounter title="1" value={oneHours} setValue={setOneHours} />
        {/* Info: (20250709 - Julian) 1.34 小時 */}
        <HourCounter title="1.34" value={oneAndOneThirdHours} setValue={setOneAndOneThirdHours} />
        {/* Info: (20250709 - Julian) 1.67 小時 */}
        <HourCounter title="1.67" value={oneAndTwoThirdsHours} setValue={setOneAndTwoThirdsHours} />
        {/* Info: (20250709 - Julian) 2 小時 */}
        <HourCounter title="2" value={twoHours} setValue={setTwoHours} />
        {/* Info: (20250709 - Julian) 2.67 小時 */}
        <HourCounter title="2.67" value={twoAndTwoThirdsHours} setValue={setTwoAndTwoThirdsHours} />
        {/* Info: (20250709 - Julian) 總加班時數 */}
        <TotalHours title="Total Overtime Hour" totalHours={totalOvertimeHours} />
      </div>

      {/* Info: (20250709 - Julian) 休假時數 */}
      <h2 className="text-lg font-bold text-text-brand-secondary-lv1">Leave Hour</h2>
      <div className="grid grid-cols-3 gap-24px">
        {/* Info: (20250709 - Julian) 病假 */}
        <HourCounter
          title="Sick / Menstrual Leave"
          value={sickLeaveHours}
          setValue={setSickLeaveHours}
        />
        {/* Info: (20250709 - Julian) 事假 */}
        <HourCounter
          title="Personal Leave"
          value={personalLeaveHours}
          setValue={setPersonalLeaveHours}
        />
        {/* Info: (20250709 - Julian) 總休假時數 */}
        <TotalHours title="Total Leave Hour" totalHours={totalLeaveHours} />
      </div>
    </form>
  );
};

export default WorkHoursForm;
