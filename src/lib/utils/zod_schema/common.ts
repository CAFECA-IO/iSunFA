import { z } from 'zod';
import { timestampInSeconds } from '@/lib/utils/common';

export const zodStringToNumber = z.string().regex(/^\d+$/).transform(Number);

export function zodStringToNumberWithDefault(defaultValue: number) {
  return z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((val) => (val ? Number(val) : defaultValue));
}

export function zodTimestampInSeconds(canBeUndefined: boolean = false) {
  if (canBeUndefined) {
    return z
      .string()
      .regex(/^\d+$/)
      .optional()
      .transform((val) => (val ? timestampInSeconds(Number(val)) : undefined));
  }
  return z
    .string()
    .regex(/^\d+$/)
    .transform((val) => timestampInSeconds(Number(val)));
}
