"use client";

import { Info, CircleCheckBig, TriangleAlert } from "lucide-react";
import { useState } from "react";

interface IKeyMetricsCardProps {
  title: string;
  value: number | string | React.ReactNode;
  description: string;
  textColor: string;
  statusGood?: boolean;
  tooltip?: string | React.ReactNode;
  className?: string;
  tooltipAlign?: TooltipAlign;
}

export enum TooltipAlign {
  LEFT = "left",
  RIGHT = "right",
}

// Info: (20260330 - Julian) 關鍵指標 card
export default function KeyMetricsCard({
  title,
  value,
  description,
  textColor,
  statusGood = undefined,
  tooltip = null,
  className = "",
  tooltipAlign = TooltipAlign.RIGHT,
}: IKeyMetricsCardProps) {
  const [isExpand, setIsExpand] = useState<boolean>(false);

  const handleMouseEnter = () => setIsExpand(true);
  const handleMouseLeave = () => setIsExpand(false);

  const isShowTooltip = tooltip !== null;
  const isShowStatus = statusGood !== undefined;

  // Info: (20260401 - Julian) 顯示數據是否符合標準
  const status = statusGood ? (
    <div className="flex items-center gap-1 text-emerald-600">
      <CircleCheckBig size={16} className="shrink-0" />
    </div>
  ) : (
    <div className="flex items-center gap-1 text-red-600">
      <TriangleAlert size={16} className="shrink-0" />
    </div>
  );

  return (
    <div className={`relative flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5  print:p-2 ${className}`}>
      {/* Info: (20260330 - Julian) Tooltip */}
      {isShowTooltip && (
        <div
          className="absolute top-2 right-2 z-10 print:hidden"
          data-html2canvas-ignore
        >
          <button
            type="button"
            className="p-1 text-slate-400 hover:text-blue-300 focus:outline-none"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
          >
            <Info size={20} strokeWidth={2} />
          </button>
          <div
            className={`absolute top-6 w-max max-w-48 rounded-md bg-blue-50 p-2 text-xs text-slate-900 ${tooltipAlign === TooltipAlign.LEFT ? "left-0" : "right-0"} ${isExpand ? "visible opacity-100" : "invisible opacity-0"} transition-all duration-300 ease-in-out`}
          >
            {tooltip}
          </div>
        </div>
      )}

      {/* Info: (20260330 - Julian) 標題 */}
      <span className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
        {title}
        {/* Info: (20260330 - Julian) 描述 */}
        <p className="mt-2 text-[11px] font-medium text-slate-400">
          {description}
        </p>
      </span>

      {/* Info: (20260330 - Julian) 數值 */}
      <div className="flex items-end justify-between gap-2">
        <span
          className={`text-3xl font-black ${textColor} print:text-xl print:text-slate-800`}
        >
          {value}
        </span>
        {/* Info: (20260330 - Julian) 狀態 */}
        {isShowStatus && status}
      </div>
    </div>
  );
}
