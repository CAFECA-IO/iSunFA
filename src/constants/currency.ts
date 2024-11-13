/**
 * Info: (20241024 - Murky)
 * @description All currency allow in ISunFa
 */
export enum CurrencyType {
  TWD = 'TWD',
  EUR = 'EUR',
}

export const OEN_CURRENCY = {
  [CurrencyType.TWD]: CurrencyType.TWD,
  [CurrencyType.EUR]: CurrencyType.EUR,
};
