"use client";

import { FC, ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface IDashboardChartCardProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}

// Info: (20260810 - Julian) 三張圖表的共用外框，維持標題列與內距一致
const DashboardChartCard: FC<IDashboardChartCardProps> = ({
  icon: Icon,
  title,
  hint = "",
  action = null,
  children,
}) => (
  <section className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-lg font-bold text-gray-700">
        <Icon className="size-5 shrink-0 text-orange-500" />
        {title}
        {hint && (
          <span className="text-xs font-normal text-gray-400">{hint}</span>
        )}
      </h3>
      {action}
    </header>
    {children}
  </section>
);

export default DashboardChartCard;
