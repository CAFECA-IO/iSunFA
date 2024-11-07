import { LocaleKey } from '@/constants/normal_setting';

export interface ICompanySetting {
  id: number;
  companyId: number;
  companyName: string;
  companyTaxId: string;
  taxSerialNumber: string;
  representativeName: string;
  country: LocaleKey;
  // Info: (202411007 - Tzuhan) @Jacky need add country code for phone number
  countryCode: LocaleKey;
  phone: string;
  address: string;
  createdAt: number;
  updatedAt: number;
}
