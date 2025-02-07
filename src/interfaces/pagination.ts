export interface IPaginatedData<T> {
  data: T;
  page: number;
  totalPages: number;
  totalCount: number; // Info: (20240716 - Jacky) 總數量
  pageSize: number; // Info: (20240716 - Jacky) 每頁顯示的項目數量
  hasNextPage: boolean; // Info: (20240716 - Jacky) 是否有下一頁
  hasPreviousPage: boolean; // Info: (20240716 - Jacky) 是否有上一頁
  sort: {
    sortBy: string; // Info: (20240716 - Jacky) 排序欄位的鍵
    sortOrder: string; // Info: (20240716 - Jacky) 排序欄位的值
  }[];
  note?: string; // Info: (20250206 - Tzuhan) 用來存成額外的資訊
}

export interface IPaginatedOptions<T> {
  data: T;
  page?: number;
  totalPages?: number;
  totalCount?: number;
  pageSize?: number;
  sort?: {
    sortBy: string;
    sortOrder: string;
  }[];
  note?: string;
}
