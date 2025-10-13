import { Event as PrismaEvent } from '@prisma/client';
import { IEventEntity } from '@/interfaces/event';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { eventEntityValidator } from '@/lib/utils/zod_schema/event';

/**
 * Info: (20241023 - Murky)
 * @description convert Event in Prisma to IEventEntity
 * @note this function do not parse associateVoucher
 * @note please check eventEntityValidator for how to parse the data
 */
export function parsePrismaEventToEventEntity(dto: PrismaEvent): IEventEntity {
  const newDto = {
    ...dto,
  };
  const { data, success, error } = eventEntityValidator.safeParse(newDto);

  if (!success) {
    throw new FormatterError('EventEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.issues,
    });
  }

  const eventEntity: IEventEntity = {
    ...data,
    associateVouchers: data.associateVouchers || [],
  };

  return eventEntity;
}
