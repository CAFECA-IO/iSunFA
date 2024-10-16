import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import { NewsType } from '@/constants/news';

// Info: (20241015 - Jacky) News list validator
const newsListQueryValidator = z.object({
  light: z.boolean().nullish(),
  type: z.nativeEnum(NewsType).nullish(),
  targetPage: z.number().int().nullish(),
  pageSize: z.number().int().nullish(),
  startDateInSecond: z.number().int().nullish(),
  endDateInSecond: z.number().int().nullish(),
  searchQuery: z.string().nullish(),
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

// Info: (20241015 - Jacky) News select validator
const newsSelectQueryValidator = z.object({
  newsId: z.number().int(),
});
const newsSelectBodyValidator = z.object({});

export const newsSelectValidator: IZodValidator<
  (typeof newsSelectQueryValidator)['shape'],
  (typeof newsSelectBodyValidator)['shape']
> = {
  query: newsSelectQueryValidator,
  body: newsSelectBodyValidator,
};
