export enum RegistrationInfoKeys {
  COUNTRY = 'country',
  LEGAL_STRUCTURE = 'legalStructure',
  BUSINESS_REGISTRATION_NUMBER = 'businessRegistrationNumber',
  REGISTRATION_DATE = 'registrationDate',
  INDUSTRY = 'industry',
}

export interface IRegistrationInfo {
  [RegistrationInfoKeys.COUNTRY]: string;
  [RegistrationInfoKeys.LEGAL_STRUCTURE]: string;
  [RegistrationInfoKeys.BUSINESS_REGISTRATION_NUMBER]: string;
  [RegistrationInfoKeys.REGISTRATION_DATE]: string;
  [RegistrationInfoKeys.INDUSTRY]: string;
}

export const initialRegistrationInfo: IRegistrationInfo = {
  [RegistrationInfoKeys.COUNTRY]: '',
  [RegistrationInfoKeys.LEGAL_STRUCTURE]: '',
  [RegistrationInfoKeys.BUSINESS_REGISTRATION_NUMBER]: '',
  [RegistrationInfoKeys.REGISTRATION_DATE]: '',
  [RegistrationInfoKeys.INDUSTRY]: '',
};
