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
