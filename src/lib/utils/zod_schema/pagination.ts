import { z } from 'zod';
import { DEFAULT_END_DATE, DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import {
  zodFilterSectionSortingOptions,
  zodStringToNumberWithDefault,
} from '@/lib/utils/zod_schema/common';

const SortSchema = z.object({
  sortBy: z.string(),
  sortOrder: z.string(),
});

export const paginatedDataQuerySchema = z.object({
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  startDate: zodStringToNumberWithDefault(0).optional(),
  endDate: zodStringToNumberWithDefault(DEFAULT_END_DATE).optional(),
  searchQuery: z.string().default('').optional(),
  sortOption: zodFilterSectionSortingOptions().optional(),
});

export const paginatedDataSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    page: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    pageSize: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    sort: z.array(SortSchema),
    note: z.string().optional(),
  });

/** Deprecated: 20250206 - Tzuhan 需要移除非陣列的 data 額外資訊放在 note
export const paginatedDataSchemaDataNotArray = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    page: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    pageSize: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    sort: z.array(SortSchema),
  });
*/
