export enum CityOptions {
  DEFAULT = '',
  GB = 'United Kingdom',
  US = 'United States',
  TW = 'Taiwan',
}
// Info: (240717 - Liz) 以下是暫存，等確定設計稿是國家還是城市後會再調整邏輯

export enum CountryCode {
  DEFAULT = '',
  GB = 'GB',
  US = 'US',
  TW = 'TW',
}

interface ICountryInfo {
  title: string;
  svg: string;
  translationKey: string;
}

export const CountryInfos: Record<CountryCode, ICountryInfo> = {
  [CountryCode.DEFAULT]: {
    title: '',
    svg: '',
    translationKey: 'KYC.DEFAULT',
  },
  [CountryCode.GB]: {
    title: 'United Kingdom',
    svg: '🇬🇧',
    translationKey: 'KYC.GB',
  },
  [CountryCode.US]: {
    title: 'United States',
    svg: '🇺🇸',
    translationKey: 'KYC.US',
  },
  [CountryCode.TW]: {
    title: 'Taiwan',
    svg: '🇹🇼',
    translationKey: 'KYC.TW',
  },
} as const;
