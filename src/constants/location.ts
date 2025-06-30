import { OEN_CURRENCY } from '@/constants/currency';

export enum LocationType {
  TW = 'Taiwan',
  HK = 'Hong Kong',
  JP = 'Japan',
  US = 'USA',
  CN = 'China',
}

export const LOCATION_OPTION = {
  [LocationType.TW]: LocationType.TW,
  [LocationType.HK]: LocationType.HK,
  [LocationType.JP]: LocationType.JP,
  [LocationType.US]: LocationType.US,
  [LocationType.CN]: LocationType.CN,
};

// Info: (20250624 - Julian) 將 location 轉換成 currency 的對應表，用於引入圖片
export const currencyByLocation: Record<LocationType, string> = {
  [LocationType.TW]: OEN_CURRENCY.TWD,
  [LocationType.HK]: OEN_CURRENCY.HKD,
  [LocationType.JP]: OEN_CURRENCY.JPY,
  [LocationType.US]: OEN_CURRENCY.USD,
  [LocationType.CN]: OEN_CURRENCY.CNY,
};
