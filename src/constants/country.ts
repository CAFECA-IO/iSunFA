import { CountryCode } from "@/constants/enums";

type CountryType = CountryCode;

/**
 * Info: (20260519 - Julian)
 * @description 用於 prompts 的國家-語言映射表(中文)
 */
export const languageMapChinese: Record<CountryType, string> = {
  [CountryCode.US]: "英語",
  [CountryCode.JP]: "日語",
  [CountryCode.TW]: "繁體中文",
  [CountryCode.KR]: "韓語",
  [CountryCode.HK]: "繁體中文",
  [CountryCode.CN]: "簡體中文",
  [CountryCode.EU]: "英語",
};

/**
 * Info: (20260519 - Julian)
 * @description 用於 prompts 的國家-語言映射表(英文)
 */
export const languageMapEnglish: Record<CountryType, string> = {
  [CountryCode.US]: "English",
  [CountryCode.JP]: "Japanese",
  [CountryCode.TW]: "Traditional Chinese",
  [CountryCode.KR]: "Korean",
  [CountryCode.HK]: "Traditional Chinese",
  [CountryCode.CN]: "Simplified Chinese",
  [CountryCode.EU]: "English",
};

/**
 * Info: (20260519 - Julian)
 * @description 透過 country 取得語言
 */
export const getLanguageByCountry = (country: CountryType) => {
  return {
    chinese: languageMapChinese[country],
    english: languageMapEnglish[country],
  };
};

export const COUNTRY_MAPPING: Record<CountryCode, string> = {
  [CountryCode.TW]: "臺灣",
  [CountryCode.US]: "美國",
  [CountryCode.CN]: "中國",
  [CountryCode.JP]: "日本",
  [CountryCode.EU]: "歐洲",
  [CountryCode.HK]: "香港",
  [CountryCode.KR]: "韓國",
};

export const CurrencyMap: Record<CountryCode, string> = {
  [CountryCode.TW]: "TWD",
  [CountryCode.US]: "USD",
  [CountryCode.JP]: "JPY",
  [CountryCode.CN]: "CNY",
  [CountryCode.HK]: "HKD",
  [CountryCode.KR]: "KRW",
  [CountryCode.EU]: "EUR",
};

export const FIAT_CURRENCIES = Object.values(CurrencyMap);
