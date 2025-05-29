import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { Counterparty as PrismaCounterParty } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import { CounterpartyType } from '@/constants/counterparty';
import { IAccountBookWithoutTeamEntity } from '@/interfaces/account_book';

/**
 * Info: (20241111 - Murky)
 * @note id is 0 when not saved in database
 */
export function initCounterPartyEntity(
  dto: Partial<PrismaCounterParty> & {
    companyId: number;
    name: string;
    taxId: string;
    type: CounterpartyType;
    company?: IAccountBookWithoutTeamEntity;
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

export function parseCounterPartyFromNoInInvoice(no: string): {
  note: string;
  name: string;
  taxId: string;
  type: CounterpartyType;
} {
  let result = {
    note: '',
    name: '',
    taxId: '',
    type: CounterpartyType.SUPPLIER,
  };

  try {
    result = JSON.parse(no);
  } catch {
    // Info: (20241223 - Murky) 如果解析失敗，保持預設值
  }

  return result;
}
