export enum LocaleKey {
  tw = 'tw',
  hk = 'hk',
  jp = 'jp',
  en = 'en',
  cn = 'cn',
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
  jp: { id: LocaleKey.jp, name: '日本語', icon: '/icons/jp.svg' },
  hk: { id: LocaleKey.hk, name: '繁體中文', icon: '/icons/hk.svg' },
};

// Info: (20241105 - Tzuhan) Country Map
export const CountriesMap: Record<LocaleKey, LocaleEntry> = {
  tw: { id: LocaleKey.tw, name: 'Taiwan', icon: '/icons/tw.svg' },
  cn: { id: LocaleKey.cn, name: 'China', icon: '/icons/cn.svg' },
  en: { id: LocaleKey.en, name: 'United States', icon: '/icons/en.svg' },
  jp: { id: LocaleKey.jp, name: 'Japan', icon: '/icons/jp.svg' },
  hk: { id: LocaleKey.hk, name: 'Hong Kong', icon: '/icons/hk.svg' },
};

export const countryList: LocaleEntry[] = Object.values(CountriesMap);

// Info: (20241105 - Tzuhan) Phone Country Code Map
export const CountryCodeMap: Record<LocaleKey, LocaleEntry> = {
  en: { id: LocaleKey.en, name: 'United State', icon: '/icons/en.svg', code: '+1' }, // Info: (20241105 - Tzuhan) No code since "en" is a language, not a country, 先用美國
  tw: { id: LocaleKey.tw, name: 'Taiwan', icon: '/icons/tw.svg', code: '+886' },
  cn: { id: LocaleKey.cn, name: 'China', icon: '/icons/cn.svg', code: '+86' },
  jp: { id: LocaleKey.jp, name: 'Japan', icon: '/icons/jp.svg', code: '+81' },
  hk: { id: LocaleKey.hk, name: 'Hong Kong', icon: '/icons/hk.svg', code: '+852' },
  //   us: { id: LocaleKey.us, name: 'United States', icon: '/icons/us.svg', code: '+1' }, // "us" for United States with code +1
};
