import { Company as PrismaCompany } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import { ICompanyEntity } from '@/interfaces/company';

/**
 * Info: (20241023 - Murky)
 * @description Create ICompanyEntity from scratch
 */
export function initCompanyEntity(
  dto: Partial<PrismaCompany> & {
    name: string;
    taxId: string;
  }
): ICompanyEntity {
  const nowInSecond = getTimestampNow();

  const companyEntity: ICompanyEntity = {
    id: dto.id || 0,
    name: dto.name,
    taxId: dto.taxId,
    startDate: dto.startDate || nowInSecond,
    createdAt: dto.createdAt || nowInSecond,
    updatedAt: dto.updatedAt || nowInSecond,
    deletedAt: dto.deletedAt || null,
  };

  return companyEntity;
}
