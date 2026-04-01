"use client";

import { Info } from "lucide-react";
import { useState } from "react";

interface IKeyMetricsCardProps {
  title: string;
  value: number | string;
  description: string;
  textColor: string;
  tooltip?: string | React.ReactNode;
}

// Info: (20260330 - Julian) 關鍵指標 card
export default function KeyMetricsCard({
  title,
  value,
  description,
  textColor,
  tooltip = null,
}: IKeyMetricsCardProps) {
  const [isExpand, setIsExpand] = useState<boolean>(false);

  const handleMouseEnter = () => setIsExpand(true);
  const handleMouseLeave = () => setIsExpand(false);

  const isShowTooltip = tooltip !== null;

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm print:w-1/4 print:p-2">
      {/* Info: (20260330 - Julian) Tooltip */}
      {isShowTooltip && (
        <div className="absolute top-2 right-2 z-10 print:hidden" data-html2canvas-ignore>
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
            className={`absolute top-6 text-slate-900 right-0 w-max max-w-48 rounded-md bg-blue-50 p-2 text-xs shadow-md ${isExpand ? "visible opacity-100" : "invisible opacity-0"} transition-all duration-300 ease-in-out`}
          >
            {tooltip}
          </div>
        </div>
      )}

      {/* Info: (20260330 - Julian) 標題 */}
      <span className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
        {title}
      </span>

      {/* Info: (20260330 - Julian) 數值 */}
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-black ${textColor} print:text-xl`}>{value}</span>
      </div>

      {/* Info: (20260330 - Julian) 描述 */}
      <p className="mt-2 text-[11px] font-medium text-slate-400">
        {description}
      </p>
    </div>
  );
}
