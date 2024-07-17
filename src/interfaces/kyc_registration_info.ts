import { CountryOptions, LegalStructureOptions, IndustryOptions } from '@/constants/kyc';

export enum RegistrationInfoKeys {
  COUNTRY = 'country',
  LEGAL_STRUCTURE = 'legalStructure',
  BUSINESS_REGISTRATION_NUMBER = 'businessRegistrationNumber',
  REGISTRATION_DATE = 'registrationDate',
  INDUSTRY = 'industry',
}

export interface IRegistrationInfo {
  [RegistrationInfoKeys.COUNTRY]: CountryOptions;
  [RegistrationInfoKeys.LEGAL_STRUCTURE]: LegalStructureOptions;
  [RegistrationInfoKeys.BUSINESS_REGISTRATION_NUMBER]: string;
  [RegistrationInfoKeys.REGISTRATION_DATE]: string;
  [RegistrationInfoKeys.INDUSTRY]: IndustryOptions;
}

export const initialRegistrationInfo: IRegistrationInfo = {
  [RegistrationInfoKeys.COUNTRY]: CountryOptions.DEFAULT,
  [RegistrationInfoKeys.LEGAL_STRUCTURE]: LegalStructureOptions.DEFAULT,
  [RegistrationInfoKeys.BUSINESS_REGISTRATION_NUMBER]: '',
  [RegistrationInfoKeys.REGISTRATION_DATE]: '',
  [RegistrationInfoKeys.INDUSTRY]: IndustryOptions.DEFAULT,
};
