/**
 * Info: (20241024 - Murky)
 * @description All currency allow in ISunFa
 */
export enum CurrencyType {
  TWD = 'TWD',
  // EUR = 'EUR',
  USD = 'USD',
  CNY = 'CNY',
  HKD = 'HKD',
  JPY = 'JPY',
}

export const OEN_CURRENCY = {
  [CurrencyType.TWD]: CurrencyType.TWD,
  // [CurrencyType.EUR]: CurrencyType.EUR,
  [CurrencyType.USD]: CurrencyType.USD,
  [CurrencyType.CNY]: CurrencyType.CNY,
  [CurrencyType.HKD]: CurrencyType.HKD,
  [CurrencyType.JPY]: CurrencyType.JPY,
};
