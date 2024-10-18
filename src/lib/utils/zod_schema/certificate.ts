import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';
import {
  zodStringToNumber,
  zodStringToNumberWithDefault,
  zodTimestampInSeconds,
} from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { CertificateSortBy } from '@/constants/certificate';
import { SortOrder } from '@/constants/sort';

const certificateListQueryValidator = z.object({
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  hasBeenUsed: z.boolean().optional(),
  sortBy: z.nativeEnum(CertificateSortBy).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  startDate: zodTimestampInSeconds(true, 0),
  endDate: zodTimestampInSeconds(true, Infinity),
  searchQuery: z.string().optional(),
});

const certificateListBodyValidator = z.undefined();

export const certificateReturnValidator = z.object({
  id: z.number(),
  inputOrOutput: z.enum(['input', 'output']),
  certificateDate: z.number(),
  certificateNo: z.string(),
  currencyAlias: z.string(),
  priceBeforeTax: z.number(),
  taxRatio: z.number(),
  taxPrice: z.number(),
  totalPrice: z.number(),
  counterPartyId: z.number(),
  invoiceType: z.string(),
  deductible: z.boolean(),
  connectToId: z.number().nullable(),
  name: z.string(),
  url: z.string(),
  type: z.string(),
  connectToType: z.string(),
  mimeTYpe: z.string(),
  size: z.string(),
  uploadProgress: z.number(),
  aiResultId: z.string(),
  aiStatus: z.string(),
  createAt: z.number(),
  updateAt: z.number(),
});

export const certificateListReturnValidator = z.array(certificateReturnValidator);

export const certificateListValidator: IZodValidator<
  (typeof certificateListQueryValidator)['shape']
> = {
  query: certificateListQueryValidator,
  body: certificateListBodyValidator,
};

const certificateGetOneQueryValidator = z.object({
  certificateId: zodStringToNumber,
});

const certificateGetOneBodyValidator = z.undefined();

export const certificateGetOneValidator: IZodValidator<
  (typeof certificateGetOneQueryValidator)['shape']
> = {
  query: certificateGetOneQueryValidator,
  body: certificateGetOneBodyValidator,
};

const certificatePostQueryValidator = z.object({});

const certificatePostBodyValidator = z.object({
  inputOrOutput: z.enum(['input', 'output']),
  certificateDate: z.number(),
  certificateNo: z.string(),
  currencyAlias: z.string(),
  priceBeforeTax: z.number(),
  taxRatio: z.number(),
  taxPrice: z.number(),
  totalPrice: z.number(),
  counterPartyId: z.number(),
  invoiceType: z.string(),
  deductible: z.boolean(),
  fileId: z.number(),
});

export const certificatePostValidator: IZodValidator<
  (typeof certificatePostQueryValidator)['shape'],
  (typeof certificatePostBodyValidator)['shape']
> = {
  query: certificatePostQueryValidator,
  body: certificatePostBodyValidator,
};

const certificatePutQueryValidator = z.object({
  certificateId: zodStringToNumber,
});

export const certificatePutValidator: IZodValidator<
  (typeof certificatePutQueryValidator)['shape'],
  (typeof certificatePostBodyValidator)['shape']
> = {
  query: certificatePutQueryValidator,
  body: certificatePostBodyValidator,
};

const certificateDeleteQueryValidator = z.object({
  certificateId: zodStringToNumber,
});

const certificateDeleteBodyValidator = z.object({});

export const certificateDeleteValidator: IZodValidator<
  (typeof certificateDeleteQueryValidator)['shape'],
  (typeof certificateDeleteBodyValidator)['shape']
> = {
  query: certificateDeleteQueryValidator,
  body: certificateDeleteBodyValidator,
};
