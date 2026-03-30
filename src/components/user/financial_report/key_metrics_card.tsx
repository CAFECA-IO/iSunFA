"use client";

// Info: (20260330 - Julian) 關鍵指標 card
export default function KeyMetricsCard({
  title,
  value,
  description,
  textColor,
}: {
  title: string;
  value: string;
  description: string;
  textColor: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <span className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
        {title}
      </span>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-black ${textColor}`}>{value}</span>
      </div>
      <p className="mt-2 text-[11px] font-medium text-slate-400">
        {description}
      </p>
    </div>
  );
}
