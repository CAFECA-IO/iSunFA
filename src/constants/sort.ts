enum SortOptions {
  newest = 'newest',
  oldest = 'oldest',
}

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
  CREATED_AT = 'CreatedAt',
  UPDATED_AT = 'UpdatedAt',
  JOINED_AT = 'JoinedAt',
  INVOICE_NUMBER = 'InvoiceNo',
  INVOICE_TYPE = 'certificateType',

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

  /**
   * Info: (20241111 - Shirley)
   * @Anna 試算表項目排序
   */
  BEGINNING_CREDIT_AMOUNT = 'BeginningCreditAmount',
  BEGINNING_DEBIT_AMOUNT = 'BeginningDebitAmount',
  MIDTERM_CREDIT_AMOUNT = 'MidtermCreditAmount',
  MIDTERM_DEBIT_AMOUNT = 'MidtermDebitAmount',
  ENDING_CREDIT_AMOUNT = 'EndingCreditAmount',
  ENDING_DEBIT_AMOUNT = 'EndingDebitAmount',

  /**
   * Info: (20241210 - Shirley)
   * @description 資產清單排序
   */
  ACQUISITION_DATE = 'AcquisitionDate',
}
