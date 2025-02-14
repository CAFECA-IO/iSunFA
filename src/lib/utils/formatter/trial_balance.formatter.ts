import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { TrialBalanceItem } from '@/interfaces/trial_balance';
import { pageToOffset } from '@/lib/utils/common';
import { IPaginatedData } from '@/interfaces/pagination';
import { ISortOption } from '@/interfaces/sort';

/** Info: (20241203 - Shirley)
 * 處理試算表的分頁資料
 */
export function formatPaginatedTrialBalance(
  data: TrialBalanceItem[],
  sortOption: ISortOption[],
  page: number,
  pageSize: number = DEFAULT_PAGE_LIMIT
): Omit<IPaginatedData<TrialBalanceItem[]>, 'note'> {
  const skip = pageToOffset(page, pageSize);
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedData = data.slice(skip, skip + pageSize);
  const hasNextPage = skip + pageSize < totalCount;
  const hasPreviousPage = page > 1;

  return {
    data: paginatedData,
    page,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    sort: sortOption,
  };
}
