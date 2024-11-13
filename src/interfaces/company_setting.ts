// import { LocaleKey } from '@/constants/normal_setting';

import { LocaleKey } from '@/constants/normal_setting';

export interface ICompanySetting {
  id: number;
  companyId: number;
  companyName: string;
  companyTaxId: string;
  taxSerialNumber: string;
  representativeName: string;
  // Info: (202411007 - Tzuhan) @Jacky 希望可以將 country code 與 country 分開，並且 country 改成 LocaleKey
  country: string;
  // Info: (202411007 - Tzuhan) @Jacky need add country code for phone number
  countryCode: LocaleKey;
  phone: string;
  address: string;
  createdAt: number;
  updatedAt: number;
}
