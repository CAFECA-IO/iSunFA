import React from "react";
import { Plus, Minus } from "lucide-react";
import NumericInput from "@/components/common/numeric_input";

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
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <div className="flex w-full items-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ring-1 ring-gray-200 transition-all focus-within:ring-2 focus-within:ring-orange-500">
        <button
          type="button"
          disabled={minusDisabled}
          onClick={minusClickHandler}
          className="flex h-11 items-center justify-center border-r border-gray-100 bg-gray-50 px-4 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-gray-50 text-gray-400"
        >
          <Minus size={16} />
        </button>
        <NumericInput
          value={value}
          setValue={setValue}
          min={minValue}
          max={maxValue}
          className="w-full flex-1 bg-transparent px-3 py-2 text-center text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400"
        />
        <button
          type="button"
          disabled={plusDisabled}
          onClick={plusClickHandler}
          className="flex h-11 items-center justify-center border-l border-gray-100 bg-gray-50 px-4 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-gray-50 text-gray-400"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

export default HourCounter;
