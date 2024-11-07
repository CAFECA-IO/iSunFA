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

/**
 * Info: (20241104 - Murky)
 * @description this enum is for sort option in `FilterSection`
 */
export enum SortBy {
  DATE = 'Date',
  DATE_CREATED = 'DateCreated',
  DATE_UPDATED = 'DateUpdated',
  VOUCHER_NUMBER = 'VoucherNo.',
  AMOUNT = 'Amount',
  CREDIT = 'Credit',
  DEBIT = 'Debit',
  PURCHASE_PRICE = 'PurchasePrice',
  ACCUMULATED_DEPRECIATION = 'AccumulatedDepreciation',
  RESIDUAL_VALUE = 'ResidualValue',
  REMAINING_LIFE = 'RemainingLife',

  /**
   * Info: (20241104 - Murky)
   * @tzuhan @Julian 這個是Upcoming Voucher 按照畫面最右邊的排序
   */
  PERIOD = 'Period',

  /**
   * Info: (20241104 - Murky)
   * @tzuhan @Julian 這個是Voucher 在 payment或receive list畫面中的 `Payable Amount` or `Receivable Amount` 排序
   */
  PAY_RECEIVE_TOTAL = 'Total',

  /**
   * Info: (20241104 - Murky)
   * @tzuhan @Julian 這個是Voucher 在 payment或receive list畫面中的 `Paid Amount` or `Received Amount` 排序
   */
  PAY_RECEIVE_ALREADY_HAPPENED = 'Already Happened',

  /**
   * Info: (20241104 - Murky)
   * @tzuhan @Julian 這個是Voucher 在 payment或receive list畫面中的 `Remain Amount` 排序
   */
  PAY_RECEIVE_REMAIN = 'Remain',
}
