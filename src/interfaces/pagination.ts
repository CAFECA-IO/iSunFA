export interface IPaginatedData<T> {
  data: T[];
  page: number;
  totalPages: number;
}
