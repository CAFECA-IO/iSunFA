import { z } from 'zod';
import { timestampInSeconds } from '@/lib/utils/common';
import { SortBy, SortOrder } from '@/constants/sort';

export const zodStringToNumber = z.string().regex(/^\d+$/).transform(Number);

export function zodStringToNumberWithDefault(defaultValue: number) {
  return z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((val) => (val ? Number(val) : defaultValue));
}

export function zodTimestampInSeconds(canBeUndefined: boolean = false, defaultValue?: number) {
  if (canBeUndefined) {
    return z
      .string()
      .regex(/^\d+$/)
      .optional()
      .transform((val) => (val ? timestampInSeconds(Number(val)) : defaultValue));
  }
  return z
    .string()
    .regex(/^\d+$/)
    .transform((val) => timestampInSeconds(Number(val)));
}

export function zodTimestampInSecondsNoDefault() {
  const setting = z
    .string()
    .regex(/^\d+$/)
    .transform((val) => timestampInSeconds(Number(val)));
  return setting;
}

/**
 * Info: (20241105 - Murky)
 * @description 前端的filter section sorting options, 可以用這個parse成 [{ by: SortBy, order: SortOrder }]
 * @jacky
 * @shirley
 */
export function zodFilterSectionSortingOptions() {
  const setting = z
    .string()
    .optional()
    .transform((val) => {
      if (!val) {
        return [];
      }
      const sortOptionsSlice = val.split('-');
      const sortOptions = sortOptionsSlice.map((sortOption) => {
        const [sort, order] = sortOption.split(':');
        return {
          sortBy: sort,
          sortOrder: order,
        };
      });
      return sortOptions;
    })
    .pipe(
      z.array(
        z.object({
          sortBy: z.nativeEnum(SortBy),
          sortOrder: z.nativeEnum(SortOrder),
        })
      )
    );
  return setting;
}

export const nullSchema = z.union([z.object({}), z.string()]);

export const nullAPISchema = {
  input: {
    querySchema: nullSchema,
    bodySchema: nullSchema,
  },
  outputSchema: nullSchema,
  frontend: nullSchema,
};
