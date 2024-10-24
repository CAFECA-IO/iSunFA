/**
 * Info: (20241023 - Murky)
 * @description which is the counter party relation from our company perspective
 * @enum - [SUPPLER, CLIENT, BOTH]
 */
export enum CounterPartyEntityType {
  /**
   * Info: (20241023 - Murky)
   * @description we are buyer, they are seller
   */
  SUPPLIER = 'SUPPLIER',
  /**
   * Info: (20241023 - Murky)
   * @description we are seller, they are buyer
   */
  CLIENT = 'CLIENT',

  /**
   * Info: (20241023 - Murky)
   * @description we are both supplier and client
   */
  BOTH = 'BOTH',
}
