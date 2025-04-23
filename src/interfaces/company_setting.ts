import { LocaleKey } from '@/constants/normal_setting';
import { Prisma } from '@prisma/client';

export interface IAccountBookInfo {
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

export type IAccountBookWithRelations = Prisma.CompanySettingGetPayload<{
  include: {
    company: {
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
