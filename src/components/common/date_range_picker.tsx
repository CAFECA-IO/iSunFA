"use client";

import { X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

interface IDateRangePickerProps {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  className?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  startPlaceholder = "",
  endPlaceholder = "",
  className = "flex w-full items-center justify-center gap-2 text-slate-400 lg:w-auto",
}: IDateRangePickerProps) {
  const { t } = useTranslation();

  const startPlaceholderStr = startPlaceholder || t("date.start_date");
  const endPlaceholderStr = endPlaceholder || t("date.end_date");

  return (
    <div className={className}>
      <div className="relative flex flex-1 items-center rounded-lg border border-slate-300 bg-white px-3 py-2.5">
        {!startDate && (
          <span className="pointer-events-none absolute left-3 text-xs text-slate-400 lg:text-sm">
            {startPlaceholderStr}
          </span>
        )}
        <input
          type="date"
          aria-label="startDate"
          value={startDate}
          max={endDate || undefined}
          onChange={(e) => setStartDate(e.target.value)}
          className={`w-full bg-transparent text-xs outline-none lg:text-sm ${
            startDate ? "text-slate-700" : "text-transparent"
          }`}
        />
        {startDate && (
          <button
            type="button"
            onClick={() => setStartDate("")}
            className="ml-2 text-slate-400 hover:text-slate-600 focus:outline-none z-10"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <span className="shrink-0">-</span>
      <div className="relative flex flex-1 items-center rounded-lg border border-slate-300 bg-white px-3 py-2.5">
        {!endDate && (
          <span className="pointer-events-none absolute left-3 text-xs text-slate-400 lg:text-sm">
            {endPlaceholderStr}
          </span>
        )}
        <input
          type="date"
          aria-label="endDate"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => setEndDate(e.target.value)}
          className={`w-full bg-transparent text-xs outline-none lg:text-sm ${
            endDate ? "text-slate-700" : "text-transparent"
          }`}
        />
        {endDate && (
          <button
            type="button"
            onClick={() => setEndDate("")}
            className="ml-2 text-slate-400 hover:text-slate-600 focus:outline-none z-10"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
