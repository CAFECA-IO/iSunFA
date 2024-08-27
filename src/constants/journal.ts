import { EventType } from '@/constants/account';
import { SortOrder } from '@/constants/sort';

export enum JOURNAL_EVENT {
  UPLOADED = 'journal:JOURNAL.UPLOADED',
  UPCOMING = 'journal:JOURNAL.UPCOMING',
}

export enum JOURNAL_TYPE {
  ALL = 'journal:JOURNAL_TYPES.ALL',
  PAYMENT = 'journal:JOURNAL_TYPES.PAYMENT',
  RECEIVING = 'journal:JOURNAL_TYPES.RECEIVING',
  TRANSFER = 'journal:JOURNAL_TYPES.TRANSFER',
}

export const toEventType = (type: JOURNAL_TYPE): EventType | undefined => {
  switch (type) {
    case JOURNAL_TYPE.ALL:
      return undefined;
    case JOURNAL_TYPE.PAYMENT:
      return EventType.PAYMENT;
    case JOURNAL_TYPE.RECEIVING:
      return EventType.INCOME;
    case JOURNAL_TYPE.TRANSFER:
      return EventType.TRANSFER;
    default:
      return undefined;
  }
};

export enum SORTING_OPTION {
  NEWEST = 'SORTING.NEWEST',
  OLDEST = 'SORTING.OLDEST',
  HIGHEST_PAYMENT_PRICE = 'SORTING.HIGHEST_PAYMENT_PRICE',
  LOWEST_PAYMENT_PRICE = 'SORTING.LOWEST_PAYMENT_PRICE',
}

export enum SortBy {
  CREATED_AT = 'createdAt',
  PAYMENT_PRICE = 'paymentPrice',
}

export const toSort = (
  type: SORTING_OPTION
): {
  sortBy: string;
  sortOrder: string;
} => {
  switch (type) {
    case SORTING_OPTION.LOWEST_PAYMENT_PRICE:
      return {
        sortBy: SortBy.PAYMENT_PRICE,
        sortOrder: SortOrder.ASC,
      };
    case SORTING_OPTION.HIGHEST_PAYMENT_PRICE:
      return {
        sortBy: SortBy.PAYMENT_PRICE,
        sortOrder: SortOrder.DESC,
      };
    case SORTING_OPTION.OLDEST:
      return {
        sortBy: SortBy.CREATED_AT,
        sortOrder: SortOrder.ASC,
      };
    case SORTING_OPTION.NEWEST:
    default:
      return {
        sortBy: SortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      };
  }
};
