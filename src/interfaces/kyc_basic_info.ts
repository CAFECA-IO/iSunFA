import { BasicInfoKeys, CountryOptions } from '@/constants/kyc';

export interface IBasicInfo {
  [BasicInfoKeys.LEGAL_ACCOUNT_BOOK_NAME]: string;
  [BasicInfoKeys.COUNTRY]: CountryOptions;
  [BasicInfoKeys.CITY]: string;
  [BasicInfoKeys.ZIP_CODE]: string;
  [BasicInfoKeys.ADDRESS]: string;
  [BasicInfoKeys.KEY_ACCOUNT_BOOK_REPRESENTATIVES_NAME]: string;
}

export const initialBasicInfo: IBasicInfo = {
  [BasicInfoKeys.LEGAL_ACCOUNT_BOOK_NAME]: '',
  [BasicInfoKeys.COUNTRY]: CountryOptions.TAIWAN,
  [BasicInfoKeys.CITY]: '',
  [BasicInfoKeys.ZIP_CODE]: '',
  [BasicInfoKeys.ADDRESS]: '',
  [BasicInfoKeys.KEY_ACCOUNT_BOOK_REPRESENTATIVES_NAME]: '',
};
