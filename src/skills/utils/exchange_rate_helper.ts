import {
  getExchangeRateToTWD,
  normalizeCurrency,
} from "@/constants/exchange_rate";

/**
 * Info: (20260525 - Luphia) 匯率換算工具函式
 * Calculates a stateless cross exchange rate between any two currencies relative to TWD.
 */
export function getCrossExchangeRateStatic(
  fromCurrency: string,
  toCurrency: string,
  date: Date,
): number {
  const fromNormalized = normalizeCurrency(fromCurrency);
  const toNormalized = normalizeCurrency(toCurrency);

  if (fromNormalized === toNormalized) return 1;

  if (fromNormalized === "TWD") {
    const toRate = getExchangeRateToTWD({
      currency: toNormalized,
      date,
    }).exchangeRate;
    return 1 / toRate;
  }

  if (toNormalized === "TWD") {
    const fromRate = getExchangeRateToTWD({
      currency: fromNormalized,
      date,
    }).exchangeRate;
    return fromRate;
  }

  const fromRate = getExchangeRateToTWD({
    currency: fromNormalized,
    date,
  }).exchangeRate;
  const toRate = getExchangeRateToTWD({
    currency: toNormalized,
    date,
  }).exchangeRate;
  return fromRate / toRate;
}
