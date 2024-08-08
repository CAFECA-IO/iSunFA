import { EventType } from '@/constants/account';
import { SortOrder } from './sort';

export enum JOURNAL_EVENT {
  UPLOADED = 'JOURNAL.UPLOADED',
  UPCOMING = 'JOURNAL.UPCOMING',
}

export enum JOURNAL_TYPE {
  ALL = 'JOURNAL_TYPES.ALL',
  PAYMENT = 'JOURNAL_TYPES.PAYMENT',
  RECEIVING = 'JOURNAL_TYPES.RECEIVING',
  TRANSFER = 'JOURNAL_TYPES.TRANSFER',
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
