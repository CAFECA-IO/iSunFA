import { CityOptions } from '@/constants/kyc';

export enum BasicInfoKeys {
  LEGAL_COMPANY_NAME = 'legalCompanyName',
  CITY = 'city',
  ZIP_CODE = 'zipCode',
  STREET = 'street',
  KEY_COMPANY_REPRESENTATIVES_NAME = 'keyCompanyRepresentativesName',
}

export interface IBasicInfo {
  [BasicInfoKeys.LEGAL_COMPANY_NAME]: string;
  [BasicInfoKeys.CITY]: CityOptions;
  [BasicInfoKeys.ZIP_CODE]: string;
  [BasicInfoKeys.STREET]: string;
  [BasicInfoKeys.KEY_COMPANY_REPRESENTATIVES_NAME]: string;
}

export const initialBasicInfo: IBasicInfo = {
  [BasicInfoKeys.LEGAL_COMPANY_NAME]: '',
  [BasicInfoKeys.CITY]: CityOptions.DEFAULT,
  [BasicInfoKeys.ZIP_CODE]: '',
  [BasicInfoKeys.STREET]: '',
  [BasicInfoKeys.KEY_COMPANY_REPRESENTATIVES_NAME]: '',
};
