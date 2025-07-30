/**
 * Info: (20241024 - Murky)
 * @description Operation that user can interact with certificate
 * @enum [DOWNLOAD, REMOVE]
 * - DOWNLOAD: download certificate
 * - REMOVE: remove certificate
 */
export enum CERTIFICATE_USER_INTERACT_OPERATION {
  DOWNLOAD = 'Download',
  REMOVE = 'Remove',
  ADD_VOUCHER = 'Add Voucher',
  ADD_ASSET = 'Add Asset',
  DELETE = 'Delete',
}

export enum InvoiceTabs {
  WITHOUT_VOUCHER = 'withoutVoucher',
  WITH_VOUCHER = 'withVoucher',
}

export enum InvoiceTab {
  WITHOUT_VOUCHER = 'WITHOUT_VOUCHER',
  WITH_VOUCHER = 'WITH_VOUCHER',
}

export enum InvoiceDirection {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
}

export enum InvoiceType {
  ALL = 'ALL',
  INPUT_20 = 'INPUT_20',
  INPUT_21 = 'INPUT_21',
  INPUT_22 = 'INPUT_22',
  INPUT_23 = 'INPUT_23',
  INPUT_24 = 'INPUT_24',
  INPUT_25 = 'INPUT_25',
  INPUT_26 = 'INPUT_26',
  INPUT_27 = 'INPUT_27',
  INPUT_28 = 'INPUT_28',
  INPUT_29 = 'INPUT_29',
  OUTPUT_30 = 'OUTPUT_30',
  OUTPUT_31 = 'OUTPUT_31',
  OUTPUT_32 = 'OUTPUT_32',
  OUTPUT_33 = 'OUTPUT_33',
  OUTPUT_34 = 'OUTPUT_34',
  OUTPUT_35 = 'OUTPUT_35',
  OUTPUT_36 = 'OUTPUT_36',
}

export enum CurrencyCode {
  TWD = 'TWD',
  USD = 'USD',
  CNY = 'CNY',
  HKD = 'HKD',
  JPY = 'JPY',
}

export enum TaxType {
  TAXABLE = 'TAXABLE',
  TAX_FREE = 'TAX_FREE',
}

export enum DeductionType {
  DEDUCTIBLE_PURCHASE_AND_EXPENSE = 'DEDUCTIBLE_PURCHASE_AND_EXPENSE',
  DEDUCTIBLE_FIXED_ASSETS = 'DEDUCTIBLE_FIXED_ASSETS',
  NON_DEDUCTIBLE_PURCHASE_AND_EXPENSE = 'NON_DEDUCTIBLE_PURCHASE_AND_EXPENSE',
  NON_DEDUCTIBLE_FIXED_ASSETS = 'NON_DEDUCTIBLE_FIXED_ASSETS',
}
