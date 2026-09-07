"use client";

import { ChangeEvent, FC, ReactNode } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260907 - Julian) 員工列表頁的篩選列。
 *
 * 抽出來的理由是版面上的界線：篩選列與列表原本塞在同一張卡片裡，
 * 讓「條件」與「結果」看起來是同一件東西 —— 而使用者改條件時
 * 第一個要找的就是那條邊界。拆開之後兩者各有外框，與薪資紀錄頁一致。
 *
 * 這個元件**不持有任何狀態**：關鍵字與筆數都由 `EmployeeList` 傳進來。
 * 它自己記一份的話，「清除搜尋」那條路就會出現兩個真相。
 */

const inputStyle =
  "w-full rounded-xl border border-gray-200 bg-white py-2 pr-9 pl-9 text-sm text-gray-700 transition-all placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none";

export interface IEmployeeListFiltersProps {
  keyword: string;
  onKeywordChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeywordClear: () => void;
  /** Info: (20260907 - Julian) 顯示中的筆數與總筆數；相等時只講總數 */
  shownCount: number;
  totalCount: number;
  /**
   * Info: (20260907 - Julian) 新增員工鈕由呼叫端給 —— 它開的是 EmployeeList 持有的彈窗。
   *
   * 這是這個元件收的唯一一個 `ReactNode`。三條提示**刻意不收** ——
   * 上一版讓它們當 children 塞進這張卡片，版面就又變回一整塊
   * （拆了元件、沒拆版面）。它們現在是 `EmployeeList` 底下的兄弟節點。
   */
  addEmployeeBtn: ReactNode;
}

const EmployeeListFilters: FC<IEmployeeListFiltersProps> = ({
  keyword,
  onKeywordChange,
  onKeywordClear,
  shownCount,
  totalCount,
  addEmployeeBtn,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:max-w-xs lg:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 shrink-0 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            aria-label={t("calculator.employee_list.search_placeholder")}
            value={keyword}
            onChange={onKeywordChange}
            placeholder={t("calculator.employee_list.search_placeholder")}
            className={inputStyle}
          />
          {keyword !== "" && (
            <button
              type="button"
              aria-label={t("calculator.employee_list.clear_search")}
              onClick={onKeywordClear}
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 lg:ml-auto lg:justify-end">
          {/**
           * Info: (20260907 - Julian) 筆數放在條件旁邊而不是列表下面。
           *
           * 它回答的是「我這組條件篩出幾個人」—— 那是條件的結果，
           * 而使用者調條件時眼睛就在這一區。
           */}
          <span className="text-xs text-gray-400">
            {shownCount === totalCount
              ? t("calculator.employee_list.total_count", {
                  count: totalCount,
                })
              : t("calculator.employee_list.filtered_count", {
                  count: shownCount,
                  total: totalCount,
                })}
          </span>
          {addEmployeeBtn}
        </div>
      </div>
    </div>
  );
};

export default EmployeeListFilters;
