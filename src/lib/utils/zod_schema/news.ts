import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import { NewsType } from '@/constants/news';

// Info: (20241015 - Jacky) News list validator
const newsListQueryValidator = z.object({
  simple: z.boolean().optional(),
  type: z.nativeEnum(NewsType).optional(),
  targetPage: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  startDateInSecond: z.number().int().optional(),
  endDateInSecond: z.number().int().optional(),
  searchQuery: z.string().optional(),
});

const newsListBodyValidator = z.object({});

export const newsListValidator: IZodValidator<
  (typeof newsListQueryValidator)['shape'],
  (typeof newsListBodyValidator)['shape']
> = {
  query: newsListQueryValidator,
  body: newsListBodyValidator,
};

// Info: (20241015 - Jacky) News post validator
const newsPostQueryValidator = z.object({});
const newsPostBodyValidator = z.object({
  type: z.nativeEnum(NewsType),
  title: z.string(),
  content: z.string(),
});

export const newsPostValidator: IZodValidator<
  (typeof newsPostQueryValidator)['shape'],
  (typeof newsPostBodyValidator)['shape']
> = {
  query: newsPostQueryValidator,
  body: newsPostBodyValidator,
};

// Info: (20241024 - Jacky) News get by id validator
const newsGetByIdQueryValidator = z.object({
  newsId: z.number().int(),
});
const newsGetByIdBodyValidator = z.object({});

export const newsGetValidator: IZodValidator<
  (typeof newsGetByIdQueryValidator)['shape'],
  (typeof newsGetByIdBodyValidator)['shape']
> = {
  query: newsGetByIdQueryValidator,
  body: newsGetByIdBodyValidator,
};
