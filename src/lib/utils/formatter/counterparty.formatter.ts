import { Counterparty as PrismaCounterParty } from '@prisma/client';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { counterPartyEntityValidator } from '@/constants/counterparty';

/**
 * Info: (20241023 - Murky)
 * @description convert CounterParty from prisma to ICounterPartyEntity
 */
export function parsePrismaCounterPartyToCounterPartyEntity(
  dto: PrismaCounterParty
): ICounterPartyEntity {
  // ToDo: (20241023 - Murky) Need to move to other place
  const { data, success, error } = counterPartyEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('CounterPartyEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  return data;
}
