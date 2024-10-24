/**
 * Info: (20241023 - Murky)
 * @description Which event is the 'EventEntity' refer to,
 * which means relation between voucher under which event
 */
export enum EventEntityType {
  /**
   * Info: (20241023 - Murky)
   * @description voucher is created because asset is purchased
   */
  ASSET = 'asset',

  /**
   * Info: (20241023 - Murky)
   * @description voucher is created because account need to be happened repeatedly
   */
  REPEAT = 'repeat',

  /**
   * Info: (20241023 - Murky)
   * @description voucher is created because of account need to be revert, like account receivable or payable
   */
  REVERT = 'revert',
}

/**
 * Info: (20241023 - Murky)
 * @description If EventEntity happened repeatedly, how frequent it is
 */
export enum EventEntityFrequency {
  /**
   * Info: (20241023 - Murky)
   * @description Happened only once, used when not need to be repeated
   */
  ONCE = 'once',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}
