export interface IPaginatedData<T> {
  data: T;
  page: number;
  totalPages: number;
  totalCount: number; // 總數量
  pageSize: number; // 每頁顯示的項目數量
  hasNextPage: boolean; // 是否有下一頁
  hasPreviousPage: boolean; // 是否有上一頁
  sort: {
    sortBy: string; // 排序欄位的鍵
    sortOrder: string; // 排序欄位的值
  }[];
}
