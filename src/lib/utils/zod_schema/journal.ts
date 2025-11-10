import { z } from 'zod';
import type { ZodRawShape } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import {
  zodStringToNumber,
  zodStringToNumberWithDefault,
  zodTimestampInSeconds,
} from '@/lib/utils/zod_schema/common';
import { EVENT_TYPE } from '@/constants/account';
import { SortBy } from '@/constants/journal';
import { SortOrder } from '@/constants/sort';

const journalListQueryValidator = z.object({
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT), // Info: (20240912 - Murky) If page not provided, default to 1
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  sortBy: z.nativeEnum(SortBy).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  eventType: z.nativeEnum(EVENT_TYPE).optional(),
  startDate: zodTimestampInSeconds(true),
  endDate: zodTimestampInSeconds(true),
  searchQuery: z.string().optional(),
});

const journalListBodyValidator = z.object({});

export const journalListValidator: IZodValidator<
  (typeof journalListQueryValidator)['shape'],
  (typeof journalListBodyValidator)['shape']
> = {
  query: journalListQueryValidator,
  body: journalListBodyValidator,
};

const journalGetOneQueryValidator = z.object({
  journalId: zodStringToNumber,
});

const journalGetOneBodyValidator = z.object({});

export const journalGetOneValidator: IZodValidator<
  (typeof journalGetOneQueryValidator)['shape'],
  (typeof journalGetOneBodyValidator)['shape']
> = {
  query: journalGetOneQueryValidator,
  body: journalGetOneBodyValidator,
};

const journalDeleteQueryValidator = z.object({
  journalId: zodStringToNumber,
});

const journalDeleteBodyValidator = z.object({});

export const journalDeleteValidator: IZodValidator<
  (typeof journalDeleteQueryValidator)['shape'],
  (typeof journalDeleteBodyValidator)['shape']
> = {
  query: journalDeleteQueryValidator,
  body: journalDeleteBodyValidator,
};

export const journalRequestValidators: {
  [method: string]: IZodValidator<ZodRawShape, ZodRawShape>;
} = {
  GET_ONE: journalGetOneValidator,
  GET_LIST: journalListValidator,
  DELETE: journalDeleteValidator,
};
