import { COUNTRY } from "@/constants/accounts";

type CountryType = (typeof COUNTRY)[keyof typeof COUNTRY];

/**
 * Info: (20260519 - Julian)
 * @description 用於 prompts 的國家-語言映射表
 */
export const languageMap: Record<CountryType, string> = {
  [COUNTRY.US]: "英語",
  [COUNTRY.JP]: "日語",
  [COUNTRY.TW]: "繁體中文",
  [COUNTRY.KR]: "韓語",
  [COUNTRY.HK]: "繁體中文",
  [COUNTRY.CN]: "簡體中文",
};

/**
 * Info: (20260519 - Julian)
 * @description 透過 country 取得語言
 */
export const getLanguageByCountry = (country: CountryType) => {
  return languageMap[country];
};
