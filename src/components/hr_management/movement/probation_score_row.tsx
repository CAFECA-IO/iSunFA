"use client";

import { FC } from "react";
import { Star } from "lucide-react";
import {
  PROBATION_SCORE_MAX,
  PROBATION_SCORE_MIN,
} from "@/constants/hr_management";

interface IProbationScoreRowProps {
  label: string;
  value: number;
  onChange: (score: number) => void;
}

/**
 * Info: (20260811 - Julian) 單一評分項。
 *
 * 星星旁邊一定要有數字：星星適合快速比較，但「這是 3 分還是 4 分」
 * 在寫進考核紀錄時必須是明確的，避免數星星數錯。
 */
const ProbationScoreRow: FC<IProbationScoreRowProps> = ({
  label,
  value,
  onChange,
}) => {
  const options = Array.from(
    { length: PROBATION_SCORE_MAX - PROBATION_SCORE_MIN + 1 },
    (unused, index) => PROBATION_SCORE_MIN + index,
  );

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 flex-1 text-sm text-gray-600">{label}</span>
      <div className="flex shrink-0 items-center gap-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            aria-label={`${label} ${option}`}
            className="rounded p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`size-5 shrink-0 ${
                option <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
        <span className="ml-1 w-6 text-right text-sm font-semibold text-gray-700">
          {value}
        </span>
      </div>
    </div>
  );
};

export default ProbationScoreRow;
