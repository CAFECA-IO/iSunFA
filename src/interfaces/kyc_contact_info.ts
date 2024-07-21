import { AreaCodeOptions, ContactInfoKeys } from '@/constants/kyc';

export interface IContactInfo {
  [ContactInfoKeys.AREA_CODE]: AreaCodeOptions;
  [ContactInfoKeys.CONTACT_NUMBER]: string;
  [ContactInfoKeys.CONTACT_PHONE]: string;
  [ContactInfoKeys.KEY_CONTACT_PERSON]: string;
  [ContactInfoKeys.EMAIL_ADDRESS]: string;
  [ContactInfoKeys.COMPANY_WEBSITE]: string;
}

export const initialContactInfo: IContactInfo = {
  [ContactInfoKeys.KEY_CONTACT_PERSON]: '',
  [ContactInfoKeys.AREA_CODE]: AreaCodeOptions.TAIWAN,
  [ContactInfoKeys.CONTACT_NUMBER]: '',
  [ContactInfoKeys.CONTACT_PHONE]: '',
  [ContactInfoKeys.EMAIL_ADDRESS]: '',
  [ContactInfoKeys.COMPANY_WEBSITE]: '',
};
