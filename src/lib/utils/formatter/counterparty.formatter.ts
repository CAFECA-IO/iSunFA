import { Counterparty as PrismaCounterParty } from '@prisma/client';
import { z } from 'zod';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { CounterpartyType } from '@/constants/counterparty';

/**
 * Info: (20241023 - Murky)
 * @description convert CounterParty from prisma to ICounterPartyEntity
 */
export function parsePrismaCounterPartyToCounterPartyEntity(
  dto: PrismaCounterParty
): ICounterPartyEntity {
  // ToDo: (20241023 - Murky) Need to move to other place
  const counterPartyEntitySchema = z.object({
    id: z.number(),
    companyId: z.number(),
    name: z.string(),
    code: z.string(),
    taxId: z.string(),
    type: z.nativeEnum(CounterpartyType),
    note: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  });

  const { data, success, error } = counterPartyEntitySchema.safeParse(dto);

  if (!success) {
    throw new FormatterError('CounterPartyEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  return data;
}
