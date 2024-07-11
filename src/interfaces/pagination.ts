export interface IPaginatedItem<T> {
  data: T[];
  page: number;
  totalPages: number;
}
