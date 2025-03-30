import { DefaultValue } from '@/constants/default_value';
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';

export const toPaginatedData = <T>(options: IPaginatedOptions<T>) => {
  const { data, page, totalPages, totalCount, pageSize, sort } = options;
  const currentData = data as unknown[];

  // Info: (20250113 - Luphia) 未輸入 page 時，預設為第一頁
  const currentPage = page || DefaultValue.PAGE;

  // Info: (20250113 - Luphia) 未輸入 totalPages 時，預設共有一頁
  const currentTotalPages = totalPages || DefaultValue.TOTAL_PAGES;

  // Info: (20250113 - Luphia) 未輸入 pageSize 時，預設每頁顯示十筆資料
  const currentPageSize = pageSize || DefaultValue.PAGE_SIZE;

  // Info: (20250113 - Luphia) 未輸入 totalCount 時，預設由當下頁數搭配 currentPageSize 計算之前幾頁的資料總數，最後加上 data 資料集長度
  const currentTotalCount =
    totalCount || (currentPage - 1) * currentPageSize + (currentData?.length || 0);

  // Info: (20250113 - Luphia) 未輸入 sort 時，預設為空
  const currentSort = (sort || []) as { sortBy: string; sortOrder: string }[];

  const hasNextPage = currentPage < currentTotalPages;
  const hasPreviousPage = currentPage > 1;
  const result: IPaginatedData<T> = {
    data,
    page: currentPage,
    totalPages: currentTotalPages,
    totalCount: currentTotalCount,
    pageSize: currentPageSize,
    hasNextPage,
    hasPreviousPage,
    sort: currentSort,
  };
  return result;
};
