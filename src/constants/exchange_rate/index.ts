import { EXCHANGE_RATE_2010 } from "@/constants/exchange_rate/rate_2010";
import { EXCHANGE_RATE_2011 } from "@/constants/exchange_rate/rate_2011";
import { EXCHANGE_RATE_2012 } from "@/constants/exchange_rate/rate_2012";
import { EXCHANGE_RATE_2013 } from "@/constants/exchange_rate/rate_2013";
import { EXCHANGE_RATE_2014 } from "@/constants/exchange_rate/rate_2014";
import { EXCHANGE_RATE_2015 } from "@/constants/exchange_rate/rate_2015";
import { EXCHANGE_RATE_2016 } from "@/constants/exchange_rate/rate_2016";
import { EXCHANGE_RATE_2017 } from "@/constants/exchange_rate/rate_2017";
import { EXCHANGE_RATE_2018 } from "@/constants/exchange_rate/rate_2018";
import { EXCHANGE_RATE_2019 } from "@/constants/exchange_rate/rate_2019";
import { EXCHANGE_RATE_2020 } from "@/constants/exchange_rate/rate_2020";
import { EXCHANGE_RATE_2021 } from "@/constants/exchange_rate/rate_2021";
import { EXCHANGE_RATE_2022 } from "@/constants/exchange_rate/rate_2022";
import { EXCHANGE_RATE_2023 } from "@/constants/exchange_rate/rate_2023";
import { EXCHANGE_RATE_2024 } from "@/constants/exchange_rate/rate_2024";
import { EXCHANGE_RATE_2025 } from "@/constants/exchange_rate/rate_2025";
import { EXCHANGE_RATE_2026 } from "@/constants/exchange_rate/rate_2026";

export interface IExchangeRate {
  date: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: string;
  note?: string;
}

// Info: (20260515 - Julian) 國際 ISO 4217 代碼
export enum CurrencyCode {
  HKD = "HKD",
  USD = "USD",
  TWD = "TWD",
  CNY = "CNY",
  JPY = "JPY",
  KRW = "KRW",
}

// Info: (20260515 - Julian) 幣種別名 Map
const CURRENCY_ALIAS_MAP: Record<string, CurrencyCode> = {
  RMB: CurrencyCode.CNY,
};

// Info: (20260515 - Julian) 將傳入的幣別字串轉換為標準的國際 ISO 4217 代碼
export const normalizeCurrency = (currency: string): string => {
  if (!currency) return "";
  const upperCurrency = currency.trim().toUpperCase();
  return CURRENCY_ALIAS_MAP[upperCurrency] || upperCurrency;
};

const ALL_EXCHANGE_RATES: IExchangeRate[] = [
  ...EXCHANGE_RATE_2010,
  ...EXCHANGE_RATE_2011,
  ...EXCHANGE_RATE_2012,
  ...EXCHANGE_RATE_2013,
  ...EXCHANGE_RATE_2014,
  ...EXCHANGE_RATE_2015,
  ...EXCHANGE_RATE_2016,
  ...EXCHANGE_RATE_2017,
  ...EXCHANGE_RATE_2018,
  ...EXCHANGE_RATE_2019,
  ...EXCHANGE_RATE_2020,
  ...EXCHANGE_RATE_2021,
  ...EXCHANGE_RATE_2022,
  ...EXCHANGE_RATE_2023,
  ...EXCHANGE_RATE_2024,
  ...EXCHANGE_RATE_2025,
  ...EXCHANGE_RATE_2026,
];

// Info: (20260515 - Julian) 將匯率按目標幣別分組
const RATES_BY_CURRENCY = ALL_EXCHANGE_RATES.reduce(
  (acc, curr) => {
    if (!acc[curr.targetCurrency]) {
      acc[curr.targetCurrency] = [];
    }
    acc[curr.targetCurrency].push(curr);
    return acc;
  },
  {} as Record<string, IExchangeRate[]>,
);

// Info: (20260515 - Julian) 遞減排序，方便查找
for (const currency in RATES_BY_CURRENCY) {
  RATES_BY_CURRENCY[currency].sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Info: (20260515 - Julian) 取得指定日期的目標幣別對 TWD 的匯率
export const getExchangeRateToTWD = ({
  currency,
  date,
}: {
  currency: string;
  date: Date;
}): { exchangeRate: number } => {
  // Info: (20260515 - Julian) Date 轉換字串
  const targetDateStr = date.toISOString().split("T")[0];

  // Info: (20260515 - Julian) 幣別代碼標準化
  const normalizedCurrency = normalizeCurrency(currency);

  // Info: (20260515 - Julian) 取得目標幣別的匯率
  const currencyRates = RATES_BY_CURRENCY[normalizedCurrency];
  if (!currencyRates) {
    throw new Error(`Currency ${currency} not supported or no data available.`);
  }

  // Info: (20260515 - Julian) 遞減排序，所以第一個小於等於目標日期的就是最接近的歷史匯率
  const closestRate = currencyRates.find((r) => r.date <= targetDateStr);

  if (!closestRate) {
    throw new Error(
      `No exchange rate found for ${currency} on or before ${targetDateStr}`,
    );
  }

  return { exchangeRate: parseFloat(closestRate.rate) };
};
