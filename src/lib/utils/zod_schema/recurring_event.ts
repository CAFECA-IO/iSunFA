/**
 * Info: (20240927 - Murky)
 * V2 validator below
 */

import { z } from 'zod';

export const recurringEventForVoucherPostValidatorV2 = z.object({
  type: z.enum(['week', 'month', 'year']),
  startDate: z.number().int(),
  endDate: z.number().int(),
  daysOfWeek: z.array(z.number().int()),
  daysOfMonth: z.array(z.number().int()),
  daysOfYears: z.array(
    z.object({
      month: z.number().int(),
      day: z.number().int(),
    })
  ),
});
