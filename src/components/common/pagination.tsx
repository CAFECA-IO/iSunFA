import { useState, useEffect, KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

interface IPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: IPaginationProps) {
  const { t } = useTranslation();
  const [inputPage, setInputPage] = useState<string>("");

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  const handleGo = () => {
    const page = parseInt(inputPage, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setInputPage(String(currentPage));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleGo();
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:px-6">
      {/* Info: (20260324 - Julian) 隱藏左側佔位，讓中間和右側可以平均分配 */}
      <div className="hidden flex-1 sm:block"></div>

      {/* Info: (20260324 - Julian) 中心：上下頁按鈕 */}
      <div className="flex w-full justify-center gap-3 sm:w-auto sm:flex-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          className="flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("common.pagination.prev")}
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage >= totalPages}
          className="flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("common.pagination.next")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </div>

      {/* Info: (20260324 - Julian) 右側：頁數資訊與跳轉 */}
      <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:w-auto sm:flex-1 sm:justify-end">
        <span className="text-sm font-semibold text-slate-600">
          {t("common.pagination.page_info", {
            current: currentPage,
            total: totalPages,
          })}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            aria-label="Go to specific page"
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm font-semibold text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
            placeholder={String(currentPage)}
          />
          <button
            type="button"
            onClick={handleGo}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none"
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
}
