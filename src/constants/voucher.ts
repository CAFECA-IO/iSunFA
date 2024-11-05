export enum VoucherV2Action {
  ADD_ASSET = 'add_asset',
  REVERT = 'revert',
  RECURRING = 'recurring',
}

/**
 * Info: (20241104 - Murky)
 * @describe use this when query voucher list with Filter section,
 * put this in `tab` query
 * @Julian 後端 Get list_Voucher_v2 的 tab 參數後端用這個過濾
 * @enum {string} UPLOADED - uploaded vouchers
 * @enum {string} UPCOMING - upcoming vouchers
 * @enum {string} PAYMENT - payment vouchers
 * @enum {string} RECEIVING - receiving vouchers
 * @example
 * <FilterSection<{
    unRead: {
      uploadedVoucher: number;
      upcomingEvents: number;
    };
    vouchers: IVoucherBeta[];
  }>
    tab={VoucherListTab.UPLOADED}
  />
 */
export enum VoucherListTabV2 {
  UPLOADED = 'uploaded',
  PAYMENT = 'payment',
  RECEIVING = 'receiving',
  UPCOMING = 'upcoming',
}
