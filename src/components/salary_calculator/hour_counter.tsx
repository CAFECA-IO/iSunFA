import React from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa6';
import NumericInput from '@/components/numeric_input/numeric_input';

interface IHourCounterProps {
  title: string;
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  maxValue?: number;
  minValue?: number;
}

// Info: (20250709 - Julian) 時數計數器
const HourCounter: React.FC<IHourCounterProps> = ({
  title,
  value,
  setValue,
  maxValue,
  minValue,
}) => {
  // Info: (20250822 - Julian) 如果沒有設定最小，則只在值為 0 時禁用 minus
  const minusDisabled = minValue ? value <= minValue : value === 0;
  // Info: (20250822 - Julian) 如果沒有設定最大則不禁用按鈕
  const plusDisabled = maxValue ? value >= maxValue : false;

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
          className="h-44px px-12px py-10px text-icon-surface-single-color-primary disabled:text-icon-surface-single-color-tertiary"
        >
          <FaMinus size={16} />
        </button>
        <NumericInput
          value={value}
          setValue={setValue}
          min={minValue}
          max={maxValue}
          className="w-80px flex-1 bg-transparent px-12px py-10px text-center font-medium text-input-text-input-filled"
        />
        <button
          type="button"
          disabled={plusDisabled}
          onClick={plusClickHandler}
          className="h-44px px-12px py-10px text-icon-surface-single-color-primary disabled:text-icon-surface-single-color-tertiary"
        >
          <FaPlus size={16} />
        </button>
      </div>
    </div>
  );
};

export default HourCounter;
