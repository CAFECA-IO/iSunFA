export enum CertificateSortBy {
  CREATE_AT = 'createAt',
  UPDATE_AT = 'updateAt',
}

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
