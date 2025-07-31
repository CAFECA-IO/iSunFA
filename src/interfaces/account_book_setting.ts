import { LocaleKey } from '@/constants/normal_setting';
import { Prisma } from '@prisma/client';
import {
  FILING_FREQUENCY,
  FILING_METHOD,
  DECLARANT_FILING_METHOD,
  AGENT_FILING_ROLE,
} from '@/interfaces/account_book';

export interface IAccountBookInfo {
  id: number;
  accountBookId: number;
  accountBookName: string;
  accountBookTaxId: string;
  accountBookStartDate?: number;
  taxSerialNumber: string;
  representativeName: string;
  country: LocaleKey;
  countryCode: LocaleKey;
  phone: string;
  address:
    | {
        city: string;
        district: string;
        enteredAddress: string;
      }
    | string; // Info: (20250516 - Shirley) 支援新舊格式
  createdAt: number;
  updatedAt: number;
  businessLocation?: string; // Info: (20250606 - Shirley) 國家
  accountingCurrency?: string; // Info: (20250606 - Shirley) 會計幣別

  // Info: (20250516 - Shirley) RC2 新增欄位
  contactPerson?: string;
  city?: string; // Info: (20250516 - Shirley) 已包含在 address 中，但單獨提供方便使用
  district?: string; // Info: (20250516 - Shirley) 已包含在 address 中，但單獨提供方便使用
  enteredAddress?: string; // Info: (20250516 - Shirley) 已包含在 address 中，但單獨提供方便使用
  filingFrequency?: FILING_FREQUENCY;
  filingMethod?: FILING_METHOD;
  declarantFilingMethod?: DECLARANT_FILING_METHOD;
  declarantName?: string;
  declarantPersonalId?: string;
  declarantPhoneNumber?: string;
  agentFilingRole?: AGENT_FILING_ROLE;
  licenseId?: string;
}

export type IAccountBookWithRelations = Prisma.AccountBookSettingGetPayload<{
  include: {
    accountBook: {
      include: {
        imageFile: boolean;
        team: {
          select: {
            id: true;
            name: true;
            ownerId: true;
            members: {
              where: {
                userId: number;
                status: 'IN_TEAM';
              };
              select: {
                role: true;
              };
            };
          };
        };
      };
    };
  };
}>;
