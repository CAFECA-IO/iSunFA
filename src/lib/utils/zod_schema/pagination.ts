import { z } from 'zod';

const SortSchema = z.object({
  sortBy: z.string(),
  sortOrder: z.string(),
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
