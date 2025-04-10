import { LocaleKey } from '@/constants/normal_setting';

export interface ICompanySetting {
  id: number;
  companyId: number;
  companyName: string;
  companyTaxId: string;
  companyStartDate?: number;
  taxSerialNumber: string;
  representativeName: string;
  country: LocaleKey;
  countryCode: LocaleKey;
  phone: string;
  address: string;
  createdAt: number;
  updatedAt: number;
}
