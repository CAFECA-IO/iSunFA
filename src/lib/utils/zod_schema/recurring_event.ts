/**
 * Info: (20240927 - Murky)
 * V2 validator below
 */

import { EventEntityFrequency } from '@/constants/event';
import { z } from 'zod';

export const recurringEventForVoucherPostValidatorV2 = z.object({
  type: z.enum([EventEntityFrequency.MONTHLY, EventEntityFrequency.WEEKLY]),
  startDate: z.number().int(),
  endDate: z.number().int(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  monthsOfYear: z.array(z.number().int().min(0).max(11)),
});
