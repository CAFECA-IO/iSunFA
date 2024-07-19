import { BasicInfoKeys } from '@/constants/kyc';

export interface IBasicInfo {
  [BasicInfoKeys.LEGAL_COMPANY_NAME]: string;
  [BasicInfoKeys.CITY]: string;
  [BasicInfoKeys.ZIP_CODE]: string;
  [BasicInfoKeys.ADDRESS]: string;
  [BasicInfoKeys.KEY_COMPANY_REPRESENTATIVES_NAME]: string;
}

export const initialBasicInfo: IBasicInfo = {
  [BasicInfoKeys.LEGAL_COMPANY_NAME]: '',
  [BasicInfoKeys.CITY]: '',
  [BasicInfoKeys.ZIP_CODE]: '',
  [BasicInfoKeys.ADDRESS]: '',
  [BasicInfoKeys.KEY_COMPANY_REPRESENTATIVES_NAME]: '',
};
