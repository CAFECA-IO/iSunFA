export enum LocaleKey {
  en = 'en',
  tw = 'tw',
  cn = 'cn',
  //   us = 'us',
}

interface LocaleEntry {
  id: LocaleKey;
  name: string;
  icon: string;
  code?: string; // Info: (20241105 - Tzuhan) Optional, since not all entries have a country code
}

// Info: (20241105 - Tzuhan) Language Map
export const LanguagesMap: Record<LocaleKey, LocaleEntry> = {
  en: { id: LocaleKey.en, name: 'English', icon: '/icons/en.svg' },
  tw: { id: LocaleKey.tw, name: '繁體中文', icon: '/icons/tw.svg' },
  cn: { id: LocaleKey.cn, name: '简体中文', icon: '/icons/cn.svg' },
  //   us: { id: LocaleKey.us, name: 'English (US)', icon: '/icons/us.svg' }, // Info: (20241105 - Tzuhan) Optional if needed
};

// Info: (20241105 - Tzuhan) Country Map
export const CountriesMap: Record<LocaleKey, LocaleEntry> = {
  tw: { id: LocaleKey.tw, name: 'Taiwan', icon: '/icons/tw.svg' },
  cn: { id: LocaleKey.cn, name: 'China', icon: '/icons/cn.svg' },
  //   us: { id: LocaleKey.us, name: 'United States', icon: '/icons/us.svg' },
  en: { id: LocaleKey.en, name: 'United Kingdom', icon: '/icons/en.svg' }, // Info: (20241105 - Tzuhan) Optional if needed
};

// Info: (20241105 - Tzuhan) Phone Country Code Map
export const CountryCodeMap: Record<LocaleKey, LocaleEntry> = {
  en: { id: LocaleKey.en, name: 'English', icon: '/icons/en.svg' }, // Info: (20241105 - Tzuhan) No code since "en" is a language, not a country
  tw: { id: LocaleKey.tw, name: 'Taiwan', icon: '/icons/tw.svg', code: '+886' },
  cn: { id: LocaleKey.cn, name: 'China', icon: '/icons/cn.svg', code: '+86' },
  //   us: { id: LocaleKey.us, name: 'United States', icon: '/icons/us.svg', code: '+1' }, // "us" for United States with code +1
};
