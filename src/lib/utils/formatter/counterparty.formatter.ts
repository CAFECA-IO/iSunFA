import { Counterparty as PrismaCounterParty } from '@prisma/client';
import { PartialPrismaCounterparty } from '@/interfaces/voucher';
import { ICounterPartyEntity, ICounterPartyEntityPartial } from '@/interfaces/counterparty';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import {
  counterPartyEntityValidator,
  CounterpartyType,
  partialCounterPartyEntityValidator,
} from '@/constants/counterparty';

/**
 * Info: (20241023 - Murky)
 * @description convert CounterParty from prisma to ICounterPartyEntity
 */
export function parsePrismaCounterPartyToCounterPartyEntity(
  dto: PrismaCounterParty
): ICounterPartyEntity {
  const entity = {
    id: dto.id,
    companyId: dto.accountBookId,
    name: dto.name,
    taxId: dto.taxId,
    type: dto.type as CounterpartyType,
    note: dto.note,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    deletedAt: dto.deletedAt,
  };
  // ToDo: (20241023 - Murky) Need to move to other place
  const { data, success, error } = counterPartyEntityValidator.safeParse(entity);

  if (!success) {
    throw new FormatterError('CounterPartyEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.issues,
    });
  }

  return data;
}

/**
 * Info: (20250204 - Tzuhan)
 * @description convert CounterParty from prisma to ICounterPartyEntityPartial
 */
export function parsePartialPrismaCounterPartyToCounterPartyEntity(
  dto: PartialPrismaCounterparty
): ICounterPartyEntityPartial {
  // ToDo: (20250204 - Tzuhan) Need to move to other place
  const { data, success, error } = partialCounterPartyEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('CounterPartyEntityPartial format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.issues,
    });
  }

  return data;
}
