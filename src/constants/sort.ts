enum SortOptions {
  NEWEST = "newest",
  OLDEST = "oldest",
}

export enum SortOptionQuery {
  NEWEST = "desc",
  OLDEST = "asc",
}

export const sortOptionQuery = {
  [SortOptions.NEWEST]: SortOptionQuery.NEWEST,
  [SortOptions.OLDEST]: SortOptionQuery.OLDEST,
};

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export enum VoucherSorting {
  DATE_DESC = "date_desc",
  DATE_ASC = "date_asc",
  DEBIT_DESC = "debit_desc",
  DEBIT_ASC = "debit_asc",
  CREDIT_DESC = "credit_desc",
  CREDIT_ASC = "credit_asc",
}

/**
 * Info: (20260724 - Julian)
 * 試算表 (Trial Balance) 報表排序選項。沿用 VoucherSorting 的 `field_direction` 慣例，
 * 供 GET /trial_balance 的 `sorting` 查詢參數使用；預設以科目編號遞增 (CODE_ASC)。
 */
export enum TrialBalanceSorting {
  CODE_ASC = "code_asc",
  CODE_DESC = "code_desc",
  BEGINNING_DEBIT_DESC = "beginning_debit_desc",
  BEGINNING_DEBIT_ASC = "beginning_debit_asc",
  BEGINNING_CREDIT_DESC = "beginning_credit_desc",
  BEGINNING_CREDIT_ASC = "beginning_credit_asc",
  MIDTERM_DEBIT_DESC = "midterm_debit_desc",
  MIDTERM_DEBIT_ASC = "midterm_debit_asc",
  MIDTERM_CREDIT_DESC = "midterm_credit_desc",
  MIDTERM_CREDIT_ASC = "midterm_credit_asc",
  ENDING_DEBIT_DESC = "ending_debit_desc",
  ENDING_DEBIT_ASC = "ending_debit_asc",
  ENDING_CREDIT_DESC = "ending_credit_desc",
  ENDING_CREDIT_ASC = "ending_credit_asc",
}

/**
 * Info: (20260724 - Julian)
 * 分類帳 (Ledger) 報表排序選項。分類帳為逐筆明細並累計 running balance，
 * 預設以科目編號 + 傳票日期遞增 (CODE_ASC) 以確保餘額累計順序正確。
 */
export enum LedgerSorting {
  CODE_ASC = "code_asc",
  CODE_DESC = "code_desc",
  DATE_ASC = "date_asc",
  DATE_DESC = "date_desc",
}

/**
 * Info: (20241104 - Murky)
 * @description this enum is for sort option in `FilterSection`
 */
export enum SortBy {
  DATE = "Date",
  DATE_CREATED = "DateCreated",
  DATE_UPDATED = "DateUpdated",
  VOUCHER_NUMBER = "VoucherNo.",
  AMOUNT = "Amount",
  CREDIT = "Credit",
  DEBIT = "Debit",
  PURCHASE_PRICE = "PurchasePrice",
  ACCUMULATED_DEPRECIATION = "AccumulatedDepreciation",
  RESIDUAL_VALUE = "ResidualValue",
  REMAINING_LIFE = "RemainingLife",
  CREATED_AT = "CreatedAt",
  UPDATED_AT = "UpdatedAt",
  JOINED_AT = "JoinedAt",
  INVOICE_NUMBER = "InvoiceNo",
  INVOICE_TYPE = "certificateType",

  /**
   * Info: (20241104 - Murky)
   * @tzuhan @Julian 這個是Upcoming Voucher 按照畫面最右邊的排序
   */
  PERIOD = "Period",

  /**
   * Info: (20241104 - Murky)
   * @tzuhan @Julian 這個是Voucher 在 payment或receive list畫面中的 `Payable Amount` or `Receivable Amount` 排序
   */
  PAY_RECEIVE_TOTAL = "Total",

  /**
   * Info: (20241104 - Murky)
   * @tzuhan @Julian 這個是Voucher 在 payment或receive list畫面中的 `Paid Amount` or `Received Amount` 排序
   */
  PAY_RECEIVE_ALREADY_HAPPENED = "Already Happened",

  /**
   * Info: (20241104 - Murky)
   * @tzuhan @Julian 這個是Voucher 在 payment或receive list畫面中的 `Remain Amount` 排序
   */
  PAY_RECEIVE_REMAIN = "Remain",

  /**
   * Info: (20241111 - Shirley)
   * @Anna 試算表項目排序
   */
  BEGINNING_CREDIT_AMOUNT = "BeginningCreditAmount",
  BEGINNING_DEBIT_AMOUNT = "BeginningDebitAmount",
  MIDTERM_CREDIT_AMOUNT = "MidtermCreditAmount",
  MIDTERM_DEBIT_AMOUNT = "MidtermDebitAmount",
  ENDING_CREDIT_AMOUNT = "EndingCreditAmount",
  ENDING_DEBIT_AMOUNT = "EndingDebitAmount",

  /**
   * Info: (20241210 - Shirley)
   * @description 資產清單排序
   */
  ACQUISITION_DATE = "AcquisitionDate",
}
