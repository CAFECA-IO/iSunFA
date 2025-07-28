import React from 'react';
import { useTranslation } from 'next-i18next';
import { FaPlus, FaMinus } from 'react-icons/fa6';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import NumericInput from '@/components/numeric_input/numeric_input';
import { MIN_WORK_HOURS, MAX_OVERWORK_HOURS, MAX_LEAVE_HOURS } from '@/constants/salary_calculator';

// Info: (20250709 - Julian) 時數計數器
const HourCounter: React.FC<{
  title: string;
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  maxValue: number;
}> = ({ title, value, setValue, maxValue }) => {
  const minusDisabled = value <= MIN_WORK_HOURS;
  const plusDisabled = value >= maxValue;

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
          min={MIN_WORK_HOURS}
          max={maxValue}
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
  const { t } = useTranslation('calculator');

  const {
    // Info: (20250722 - Julian) non-taxable overtime hours state
    oneAndOneThirdHoursForNonTax,
    setOneAndOneThirdHoursForNonTax,
    oneAndTwoThirdsHoursForNonTax,
    setOneAndTwoThirdsHoursForNonTax,
    twoHoursForNonTax,
    setTwoHoursForNonTax,
    twoAndOneThirdsHoursForNonTax,
    setTwoAndOneThirdsHoursForNonTax,
    twoAndTwoThirdsHoursForNonTax,
    setTwoAndTwoThirdsHoursForNonTax,
    totalNonTaxableHours,
    // Info: (20250722 - Julian) taxable overtime hours state
    oneAndOneThirdHoursForTaxable,
    setOneAndOneThirdHoursForTaxable,
    oneAndTwoThirdsHoursForTaxable,
    setOneAndTwoThirdsHoursForTaxable,
    twoHoursForTaxable,
    setTwoHoursForTaxable,
    twoAndOneThirdsHoursForTaxable,
    setTwoAndOneThirdsHoursForTaxable,
    twoAndTwoThirdsHoursForTaxable,
    setTwoAndTwoThirdsHoursForTaxable,
    totalTaxableHours,
    // Info: (20250709 - Julian) leave hour state
    sickLeaveHours,
    setSickLeaveHours,
    personalLeaveHours,
    setPersonalLeaveHours,
    totalLeaveHours,
  } = useCalculatorCtx();

  const totalNonTaxableStyle =
    totalNonTaxableHours >= 46 ? 'text-text-state-error' : 'text-text-brand-secondary-lv1';
  const totalTaxableStyle =
    totalTaxableHours >= 46 ? 'text-text-state-error' : 'text-text-brand-secondary-lv1';

  return (
    <form className="flex flex-col gap-lv-8">
      {/* Info: (20250709 - Julian) 加班時數（免稅） */}
      <div className="flex flex-col gap-16px">
        <div className="flex items-center">
          <h2 className="flex-1 text-lg font-bold text-text-brand-secondary-lv1">
            {t('calculator:WORK_HOURS_FORM.OVERTIME_HOUR_WITHOUT_TAX')}
          </h2>
          <p className={`text-lg font-bold ${totalNonTaxableStyle}`}>{totalNonTaxableHours} hrs</p>
        </div>
        <div className="grid grid-cols-3 gap-24px">
          {/* Info: (20250709 - Julian) 1.33 小時 */}
          <HourCounter
            title="1.33"
            value={oneAndOneThirdHoursForNonTax}
            setValue={setOneAndOneThirdHoursForNonTax}
            maxValue={MAX_OVERWORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 1.66 小時 */}
          <HourCounter
            title="1.66"
            value={oneAndTwoThirdsHoursForNonTax}
            setValue={setOneAndTwoThirdsHoursForNonTax}
            maxValue={MAX_OVERWORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2 小時 */}
          <HourCounter
            title="2"
            value={twoHoursForNonTax}
            setValue={setTwoHoursForNonTax}
            maxValue={MAX_OVERWORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.33 小時 */}
          <HourCounter
            title="2.33"
            value={twoAndOneThirdsHoursForNonTax}
            setValue={setTwoAndOneThirdsHoursForNonTax}
            maxValue={MAX_OVERWORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.66 小時 */}
          <HourCounter
            title="2.66"
            value={twoAndTwoThirdsHoursForNonTax}
            setValue={setTwoAndTwoThirdsHoursForNonTax}
            maxValue={MAX_OVERWORK_HOURS}
          />
          {/* Info: (20250728 - Julian) 總加班時數 */}
          <TotalHours
            title={t('calculator:WORK_HOURS_FORM.TOTAL_OVERTIME_HOUR')}
            totalHours={totalNonTaxableHours}
          />
        </div>
      </div>

      {/* Info: (20250709 - Julian) 加班時數（應稅） */}
      <div className="flex flex-col gap-16px">
        <div className="flex items-center">
          <h2 className="flex-1 text-lg font-bold text-text-brand-secondary-lv1">
            {t('calculator:WORK_HOURS_FORM.OVERTIME_HOUR_WITH_TAX')}
          </h2>
          <p className={`text-lg font-bold ${totalTaxableStyle}`}>{totalTaxableHours} hrs</p>
        </div>
        <div className="grid grid-cols-3 gap-24px">
          {/* Info: (20250709 - Julian) 1.33 小時 */}
          <HourCounter
            title="1.33"
            value={oneAndOneThirdHoursForTaxable}
            setValue={setOneAndOneThirdHoursForTaxable}
            maxValue={MAX_OVERWORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 1.66 小時 */}
          <HourCounter
            title="1.66"
            value={oneAndTwoThirdsHoursForTaxable}
            setValue={setOneAndTwoThirdsHoursForTaxable}
            maxValue={MAX_OVERWORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2 小時 */}
          <HourCounter
            title="2"
            value={twoHoursForTaxable}
            setValue={setTwoHoursForTaxable}
            maxValue={MAX_OVERWORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.33 小時 */}
          <HourCounter
            title="2.33"
            value={twoAndOneThirdsHoursForTaxable}
            setValue={setTwoAndOneThirdsHoursForTaxable}
            maxValue={MAX_OVERWORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.66 小時 */}
          <HourCounter
            title="2.66"
            value={twoAndTwoThirdsHoursForTaxable}
            setValue={setTwoAndTwoThirdsHoursForTaxable}
            maxValue={MAX_OVERWORK_HOURS}
          />
          {/* Info: (20250728 - Julian) 總加班時數 */}
          <TotalHours
            title={t('calculator:WORK_HOURS_FORM.TOTAL_OVERTIME_HOUR')}
            totalHours={totalTaxableHours}
          />
        </div>
      </div>

      {/* Info: (20250709 - Julian) 休假時數 */}
      <div className="flex flex-col gap-16px">
        <h2 className="text-lg font-bold text-text-brand-secondary-lv1">
          {t('calculator:WORK_HOURS_FORM.LEAVE_HOUR')}
        </h2>
        <div className="grid grid-cols-3 gap-24px">
          {/* Info: (20250709 - Julian) 病假 */}
          <HourCounter
            title={t('calculator:WORK_HOURS_FORM.SICK_MENSTRUAL_LEAVE')}
            value={sickLeaveHours}
            setValue={setSickLeaveHours}
            maxValue={MAX_LEAVE_HOURS}
          />
          {/* Info: (20250709 - Julian) 事假 */}
          <HourCounter
            title={t('calculator:WORK_HOURS_FORM.PERSONAL_LEAVE')}
            value={personalLeaveHours}
            setValue={setPersonalLeaveHours}
            maxValue={MAX_LEAVE_HOURS}
          />
          {/* Info: (20250709 - Julian) 總休假時數 */}
          <TotalHours
            title={t('calculator:WORK_HOURS_FORM.TOTAL_LEAVE_HOUR')}
            totalHours={totalLeaveHours}
          />
        </div>
      </div>
    </form>
  );
};

export default WorkHoursForm;
