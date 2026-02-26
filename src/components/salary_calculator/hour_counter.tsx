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
      <div className="flex w-full items-center overflow-hidden rounded-lg bg-white ring-1 ring-gray-300 transition-all ">
        <button
          type="button"
          disabled={minusDisabled}
          onClick={minusClickHandler}
          className="flex h-12 items-center justify-center bg-gray-100 px-4 transition-colors enabled:hover:bg-orange-100 enabled:hover:text-orange-500 disabled:opacity-30 enabled:active:bg-orange-200 disabled:hover:bg-gray-50 text-gray-400"
        >
          <Minus size={20} />
        </button>
        <NumericInput
          value={value}
          setValue={setValue}
          min={minValue}
          max={maxValue}
          className="w-full flex-1 bg-transparent px-3 py-2 text-center text-base font-bold text-gray-900 outline-none placeholder:text-gray-400"
        />
        <button
          type="button"
          disabled={plusDisabled}
          onClick={plusClickHandler}
          className="flex h-12 items-center justify-center bg-gray-100 px-4 transition-colors enabled:hover:bg-orange-100 enabled:hover:text-orange-500 disabled:opacity-30 enabled:active:bg-orange-200 disabled:hover:bg-gray-50 text-gray-400"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
};

export default HourCounter;
