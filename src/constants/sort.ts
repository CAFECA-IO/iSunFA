import { SortOptions } from '@/constants/display';

export enum SortOptionQuery {
  newest = 'desc',
  oldest = 'asc',
}

export const sortOptionQuery = {
  [SortOptions.newest]: SortOptionQuery.newest,
  [SortOptions.oldest]: SortOptionQuery.oldest,
};

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortBy {
  DATE = 'Date',
  DATE_CREATED = 'Date Created',
  DATE_UPDATED = 'Date Updated',
  VOUCHER_NUMBER = 'Voucher No.',
  AMOUNT = 'Amount',
}
