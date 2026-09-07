"use client";

import { FC, ReactNode } from "react";
import { Check } from "lucide-react";

interface IOffboardingCheckRowProps {
  isChecked: boolean;
  onToggle: (next: boolean) => void;
  label: string;
  /** Info: (20260811 - Julian) 序號、卡號等接在標題後的附註 */
  tag?: string | null;
  /** Info: (20260811 - Julian) 右側說明：經辦人與日期，或預定生效時間 */
  meta: ReactNode;
  /** Info: (20260811 - Julian) 勾選後才展開的欄位，例如回收日期與損壞紀錄 */
  children?: ReactNode;
}

/**
 * Info: (20260811 - Julian) 交接清單的一列。
 * 由於按鈕內不能有輸入框，因此可點的只有上半列（左邊是事件、右邊是經辦人）。
 */
const OffboardingCheckRow: FC<IOffboardingCheckRowProps> = ({
  isChecked,
  onToggle,
  label,
  tag = null,
  meta,
  children = null,
}) => (
  <li className="border-b border-gray-100 last:border-b-0">
    <button
      type="button"
      onClick={() => onToggle(!isChecked)}
      aria-pressed={isChecked}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
    >
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
          isChecked
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-gray-300 bg-white"
        }`}
      >
        {isChecked && <Check className="size-3 shrink-0" />}
      </span>

      <span
        className={`min-w-0 shrink-0 text-sm ${isChecked ? "text-gray-400 line-through" : "text-gray-700"}`}
      >
        {label}
        {tag && (
          <span className="ml-1.5 font-mono text-xs text-gray-400">
            ({tag})
          </span>
        )}
      </span>

      <span className="hidden h-px flex-1 self-center border-b border-dashed border-gray-200 sm:block" />

      <span className="shrink-0 text-xs text-gray-500">{meta}</span>
    </button>

    {children && <div className="px-3 pb-3 pl-10">{children}</div>}
  </li>
);

export default OffboardingCheckRow;
