"use client";

import { FC } from "react";
import { toProgressPercent } from "@/lib/utils/hr_movement";

interface IMovementProgressBarProps {
  completed: number;
  total: number;
  label: string;
}

/**
 * Info: (20260810 - Julian) 任務進度條。
 *
 * 數字（4/6）與百分比（66%）兩個都給：百分比適合掃視、分數適合判斷「還差幾件」，
 * 而 HR 真正要做的決定是後者。
 */
const MovementProgressBar: FC<IMovementProgressBarProps> = ({
  completed,
  total,
  label,
}) => {
  const percent = toProgressPercent(completed, total);
  const isDone = total > 0 && completed === total;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-gray-500">
          {label} {completed}/{total}
        </span>
        <span
          className={`shrink-0 font-semibold ${isDone ? "text-emerald-600" : "text-gray-600"}`}
        >
          {percent}%
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${isDone ? "bg-emerald-500" : "bg-orange-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default MovementProgressBar;
