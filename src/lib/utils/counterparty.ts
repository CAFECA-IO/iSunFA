import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { Counterparty as PrismaCounterParty } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import { CounterPartyEntityType } from '@/constants/counterparty';
import { ICompanyEntity } from '@/interfaces/company';

export function initCounterPartyEntity(
  dto: Partial<PrismaCounterParty> & {
    companyId: number;
    name: string;
    taxId: string;
    type: CounterPartyEntityType;
    company?: ICompanyEntity;
  }
): ICounterPartyEntity {
  const nowInSecond = getTimestampNow();

  const counterPartyEntity: ICounterPartyEntity = {
    id: dto.id || 0,
    companyId: dto.companyId,
    name: dto.name,
    taxId: dto.taxId,
    type: dto.type,
    note: dto.note || '',
    createdAt: dto.createdAt || nowInSecond,
    updatedAt: dto.updatedAt || nowInSecond,
    deletedAt: dto.deletedAt || null,
    company: dto.company,
  };

  return counterPartyEntity;
}
