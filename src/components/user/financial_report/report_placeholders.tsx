"use client";

import { Loader2, CircleAlert } from "lucide-react";

interface IReportPlaceholderProps {
  title: string;
  description: string;
}

// Info: (20260330 - Julian) 載入中的轉圈圈動畫
export const LoadingPing = ({ size }: { size: number }) => {
  const circleSize = size * 1.5;
  const pingSize = size * 1.25;

  return (
    <div className="relative flex items-center justify-center">
      <div
        style={{ width: pingSize, height: pingSize }}
        className="absolute animate-ping rounded-full bg-emerald-100 opacity-60"
      ></div>
      <div
        style={{ width: circleSize, height: circleSize }}
        className="relative flex items-center justify-center rounded-full bg-emerald-50 shadow-sm ring-1 ring-emerald-100"
      >
        <Loader2 size={size} className="animate-spin text-emerald-500" />
      </div>
    </div>
  );
};

// Info: (20260330 - Julian) 載入中提示
export const ReportLoadingPlaceholder = ({
  title,
  description,
}: IReportPlaceholderProps) => {
  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-5 rounded-2xl border border-slate-100 bg-white/60 p-8 shadow-sm backdrop-blur-sm">
      <LoadingPing size={40} />
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-xl font-black tracking-widest text-slate-800">
          {title}
        </h2>
        <p className="text-sm font-medium text-slate-500">{description}</p>
      </div>
    </div>
  );
};

// Info: (20260330 - Julian) 錯誤提示
export const ReportErrorPlaceholder = ({
  title,
  description,
}: IReportPlaceholderProps) => {
  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-5 rounded-2xl border border-red-50 bg-red-50/50 p-8 shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 shadow-sm ring-1 ring-red-200">
        <CircleAlert className="h-8 w-8 text-red-500" />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-xl font-black tracking-widest text-slate-800">
          {title}
        </h2>
        <p className="text-sm font-medium text-slate-500">{description}</p>
      </div>
    </div>
  );
};
