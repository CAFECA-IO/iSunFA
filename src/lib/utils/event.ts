import { IEventEntity } from '@/interfaces/event';
// import { Event as PrismaEvent } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import { EventEntityFrequency, EventEntityType } from '@/constants/event';
import type { IVoucherEntity } from '@/interfaces/voucher';

/**
 * Info: (20241023 - Murky)
 * @description Create IEventEntity, used to record the event of voucher relate to voucher
 */
export function initEventEntity(
  // dto: Partial<PrismaEvent> & {
  dto: {
    eventType: EventEntityType;
    frequency: EventEntityFrequency;
    startDate: number;
    endDate: number;
    id?: number;
    createdAt?: number;
    updatedAt?: number;
    deletedAt?: number | null;
    dateOfWeek?: number[];
    monthsOfYear?: number[];
    associateVouchers?: {
      originalVoucher: IVoucherEntity;
      resultVoucher: IVoucherEntity;
    }[];
  }
): IEventEntity {
  const nowInSecond = getTimestampNow();

  const eventEntity: IEventEntity = {
    id: dto.id || 0,
    eventType: dto.eventType,
    frequency: dto.frequency,
    startDate: dto.startDate,
    endDate: dto.endDate,
    dateOfWeek: dto.dateOfWeek || [],
    monthsOfYear: dto.monthsOfYear || [],
    createdAt: dto.createdAt || nowInSecond,
    updatedAt: dto.updatedAt || nowInSecond,
    deletedAt: dto.deletedAt || null,
    associateVouchers: dto.associateVouchers || [],
  };

  return eventEntity;
}
