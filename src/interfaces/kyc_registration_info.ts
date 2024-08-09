import { default30DayPeriodInSec } from '@/constants/display';
import {
  CountryOptions,
  LegalStructureOptions,
  IndustryOptions,
  RegistrationInfoKeys,
} from '@/constants/kyc';

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
  [RegistrationInfoKeys.REGISTRATION_DATE]: default30DayPeriodInSec.startTimeStamp.toString(),
  [RegistrationInfoKeys.INDUSTRY]: IndustryOptions.DEFAULT,
};
