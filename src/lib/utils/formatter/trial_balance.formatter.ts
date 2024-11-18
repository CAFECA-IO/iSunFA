import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { IPaginatedTrialBalance, TrialBalanceItem } from '@/interfaces/trial_balance';
import { pageToOffset } from '@/lib/utils/common';
import { ISortOption } from '@/interfaces/sort';

/** Info: (20241118 - Shirley)
 * 分頁處理試算表資料
 * @param data 試算表的所有資料
 * @param page 當前頁數
 * @param pageSize 每頁顯示的資料數量，預設為 DEFAULT_PAGE_LIMIT
 * @param sortBy 排序欄位
 * @param sortOrder 排序順序
 * @returns 格式化後的分頁試算表資料
 */
export function formatPaginatedTrialBalance(
  data: TrialBalanceItem[],
  sortOption: ISortOption[],
  page: number,
  pageSize: number = DEFAULT_PAGE_LIMIT
): IPaginatedTrialBalance {
  const skip = pageToOffset(page, pageSize);
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedData = data.slice(skip, skip + pageSize);
  const hasNextPage = skip + pageSize < totalCount;
  const hasPreviousPage = page > 1;

  const paginatedTrialBalance: IPaginatedTrialBalance = {
    data: paginatedData,
    page,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    sort: sortOption,
  };

  return paginatedTrialBalance;
}
