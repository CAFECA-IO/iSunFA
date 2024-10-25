import { Event as PrismaEvent } from '@prisma/client';
import { z } from 'zod';
import { IEventEntity } from '@/interfaces/event';
import { EventEntityFrequency, EventEntityType } from '@/constants/event';
import { FormatterError } from '@/lib/utils/error/formatter_error';

/**
 * Info: (20241023 - Murky)
 * @description convert Event in Prisma to IEventEntity
 * @note this function do not parse associateVoucher
 */
export function parsePrismaEventToEventEntity(dto: PrismaEvent): IEventEntity {
  // ToDo: (20241023 - Murky) Need to move to other place
  const eventEntitySchema = z.object({
    id: z.number(),
    eventType: z.nativeEnum(EventEntityType),
    frequency: z.nativeEnum(EventEntityFrequency),
    startDate: z.number(),
    endDate: z.number(),
    dateOfWeek: z.array(z.number().max(6).min(0)),
    monthsOfYear: z.array(z.string().regex(/^\d+$/)),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
    associateVoucher: z.array(z.any()).optional(), // ToDo: (20241023 - Murky) It can be VoucherEntitySchema
  });

  const { data, success, error } = eventEntitySchema.safeParse(dto);

  if (!success) {
    throw new FormatterError('EventEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  const eventEntity: IEventEntity = {
    ...data,
    associateVouchers: data.associateVoucher || [],
  };

  return eventEntity;
}
