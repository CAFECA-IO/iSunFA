import { EventEntityFrequency, EventEntityType } from '@/constants/event';
import { z } from 'zod';
/**
 * Info: (20241025 - Murky)
 * @description schema for init event entity or parsed prisma event
 * @todo associateVoucher need to be implement
 */
export const eventEntityValidator = z.object({
  id: z.number(),
  eventType: z.nativeEnum(EventEntityType),
  frequency: z.nativeEnum(EventEntityFrequency),
  startDate: z.number(),
  endDate: z.number(),
  dateOfWeek: z.array(z.number().max(6).min(0)),
  monthsOfYear: z.array(z.number().max(11).min(0)),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  associateVouchers: z.array(z.any()).optional(), // ToDo: (20241023 - Murky) It can be VoucherEntitySchema
});
