import { COUNTRY } from "@/constants/accounts";

type CountryType = (typeof COUNTRY)[keyof typeof COUNTRY];

/**
 * Info: (20260519 - Julian)
 * @description 用於 prompts 的國家-語言映射表(中文)
 */
export const languageMapChinese: Record<CountryType, string> = {
  [COUNTRY.US]: "英語",
  [COUNTRY.JP]: "日語",
  [COUNTRY.TW]: "繁體中文",
  [COUNTRY.KR]: "韓語",
  [COUNTRY.HK]: "繁體中文",
  [COUNTRY.CN]: "簡體中文",
};

/**
 * Info: (20260519 - Julian)
 * @description 用於 prompts 的國家-語言映射表(英文)
 */
export const languageMapEnglish: Record<CountryType, string> = {
  [COUNTRY.US]: "English",
  [COUNTRY.JP]: "Japanese",
  [COUNTRY.TW]: "Traditional Chinese",
  [COUNTRY.KR]: "Korean",
  [COUNTRY.HK]: "Traditional Chinese",
  [COUNTRY.CN]: "Simplified Chinese",
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
