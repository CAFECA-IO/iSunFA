import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { Counterparty as PrismaCounterParty } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import { CounterpartyType } from '@/constants/counterparty';
import { ICompanyEntity } from '@/interfaces/company';

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

export function parseCounterPartyFromNoInInvoice(no: string): {
  note: string;
  name: string;
  taxId: string;
  type: CounterpartyType;
} {
  let parsed: Partial<{
    note: string;
    name: string;
    taxId: string;
    type: string;
  }> = {};

  try {
    parsed = JSON.parse(no);
  } catch {
    // Info: (20241223 - Murky) 如果解析失敗，回傳空值
    return {
      note: '',
      name: '',
      taxId: '',
      type: CounterpartyType.SUPPLIER,
    };
  }

  return {
    note: parsed.note || '',
    name: parsed.name || '',
    taxId: parsed.taxId || '',
    type: Object.values(CounterpartyType).includes(parsed.type as CounterpartyType)
      ? (parsed.type as CounterpartyType)
      : CounterpartyType.SUPPLIER,
  };
}
