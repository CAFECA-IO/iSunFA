import { z } from 'zod';
import { NewsType } from '@/constants/news';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';

// Info: (20241029 - Jacky) News null schema
const newsNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241015 - Jacky) News list schema
const newsListQuerySchema = z.object({
  simple: z.boolean().optional(),
  type: z.nativeEnum(NewsType).optional(),
  targetPage: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  startDateInSecond: z.number().int().optional(),
  endDateInSecond: z.number().int().optional(),
  searchQuery: z.string().optional(),
});

// Info: (20241015 - Jacky) News post schema
const newsPostBodySchema = z.object({
  type: z.nativeEnum(NewsType),
  title: z.string(),
  content: z.string(),
});

// Info: (20241024 - Jacky) News get by id schema
const newsGetByIdQuerySchema = z.object({
  newsId: zodStringToNumber,
});

const newsOutputSchema = z.object({
  id: z.number().int(),
  type: z.nativeEnum(NewsType),
  title: z.string(),
  content: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

const paginatedNewsOutputSchema = paginatedDataSchema(newsOutputSchema);

export const newsListSchema = {
  input: {
    querySchema: newsListQuerySchema,
    bodySchema: newsNullSchema,
  },
  outputSchema: paginatedNewsOutputSchema,
  frontend: newsNullSchema,
};

export const newsPostSchema = {
  input: {
    querySchema: newsNullSchema,
    bodySchema: newsPostBodySchema,
  },
  outputSchema: newsOutputSchema,
  frontend: newsNullSchema,
};

export const newsGetByIdSchema = {
  input: {
    querySchema: newsGetByIdQuerySchema,
    bodySchema: newsNullSchema,
  },
  outputSchema: newsOutputSchema,
  frontend: newsNullSchema,
};
