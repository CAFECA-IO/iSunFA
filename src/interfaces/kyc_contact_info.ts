export enum ContactInfoKeys {
  KEY_CONTACT_PERSON = 'keyContactPerson',
  AREA_CODE = 'areaCode',
  CONTACT_NUMBER = 'contactNumber',
  EMAIL_ADDRESS = 'emailAddress',
  COMPANY_WEBSITE = 'companyWebsite',
}

export interface IContactInfo {
  [ContactInfoKeys.KEY_CONTACT_PERSON]: string;
  [ContactInfoKeys.AREA_CODE]: string;
  [ContactInfoKeys.CONTACT_NUMBER]: string;
  [ContactInfoKeys.EMAIL_ADDRESS]: string;
  [ContactInfoKeys.COMPANY_WEBSITE]: string;
}

export const initialContactInfo: IContactInfo = {
  [ContactInfoKeys.KEY_CONTACT_PERSON]: '',
  [ContactInfoKeys.AREA_CODE]: '',
  [ContactInfoKeys.CONTACT_NUMBER]: '',
  [ContactInfoKeys.EMAIL_ADDRESS]: '',
  [ContactInfoKeys.COMPANY_WEBSITE]: '',
};
