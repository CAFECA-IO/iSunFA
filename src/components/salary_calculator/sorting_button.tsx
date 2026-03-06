import React from "react";
import { ArrowUpDown } from "lucide-react";
import { SortOrder } from "@/constants/sort";

const SortingButton: React.FC<{
  string: string;
  sortOrder: null | SortOrder;
  setSortOrder: (sortOrder: null | SortOrder) => void;
  handleReset?: () => void;
  className?: string;
}> = ({ string, sortOrder, setSortOrder, handleReset, className = "" }) => {
  const clickHandler = () => {
    // Info: (20250724 - Julian) 如果有 handleReset，則執行，用於清除其他排序狀態
    if (handleReset) {
      handleReset();
    }

    // Info: (20250724 - Julian) 初始無排序 -> 點擊後變成 ASC -> 再點擊變成 DESC -> 再點擊變回無排序
    switch (sortOrder) {
      case null:
        setSortOrder(SortOrder.ASC);
        break;
      case SortOrder.ASC:
        setSortOrder(SortOrder.DESC);
        break;
      case SortOrder.DESC:
        setSortOrder(null);
        break;
      default:
        setSortOrder(null);
        break;
    }
  };

  return (
    <button
      type="button"
      onClick={clickHandler}
      className={`gap-8px flex items-center ${className}`}
    >
      <p
        className={
          sortOrder
            ? "text-text-brand-primary-lv1"
            : "text-text-neutral-secondary"
        }
      >
        {string}
      </p>
      <ArrowUpDown
        size={16}
        className={
          sortOrder
            ? "text-text-brand-primary-lv1"
            : "text-text-neutral-tertiary"
        }
      />
    </button>
  );
};

export default SortingButton;
