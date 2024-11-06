import { CompanyTag } from '@/constants/company';

export interface ICompanySetting {
  id: number;
  companyId: number;
  companyName: string;
  companyTaxId: string;
  taxSerialNumber: string;
  representativeName: string;
  country: string;
  phone: string;
  address: string;
  createdAt: number;
  updatedAt: number;
}

export interface ICompanySettingList {
  id: number;
  partnerName: string;
  taxId: string;
  type: CompanyTag;
}
