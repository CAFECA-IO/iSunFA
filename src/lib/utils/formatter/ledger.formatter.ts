import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { SortOrder } from '@/constants/sort';
import { ILedgerItem } from '@/interfaces/ledger';
import { pageToOffset } from '@/lib/utils/common';
import { IPaginatedData } from '@/interfaces/pagination';
/** Info: (20241203 - Shirley)
 * 處理分類帳的分頁資料
 */
export function formatPaginatedLedger(
  data: ILedgerItem[],
  page: number,
  pageSize: number = DEFAULT_PAGE_LIMIT
): IPaginatedData<ILedgerItem[]> {
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
    sort: [
      {
        sortBy: 'voucherDate',
        sortOrder: SortOrder.ASC,
      },
    ],
  };
}
