"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { SortOrder } from "@/constants/sort";
import { useTranslation } from "@/i18n/i18n_context";

interface IDateSortButtonProps {
  currentOrder: SortOrder;
  onOrderChange: (sortOrder: SortOrder) => void;
}

export default function DateSortButton({
  currentOrder,
  onOrderChange,
}: IDateSortButtonProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    onOrderChange(
      currentOrder === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC,
    );
  };

  const str =
    currentOrder === SortOrder.DESC
      ? t("common.sort.newest")
      : t("common.sort.oldest");
  const icon =
    currentOrder === SortOrder.DESC ? (
      <ArrowDownWideNarrow size={16} className="ml-1 shrink-0" />
    ) : (
      <ArrowUpNarrowWide size={16} className="ml-1 shrink-0" />
    );

  return (
    <button
      type="button"
      aria-label={str}
      onClick={handleClick}
      className="flex items-center rounded-lg border border-slate-300 px-2 py-2 text-xs lg:text-sm font-bold text-slate-600 transition-colors hover:border-orange-400 hover:text-orange-400 focus:border-orange-400 lg:px-4"
    >
      {str}
      {icon}
    </button>
  );
}
