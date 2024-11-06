import { IZodValidator } from '@/interfaces/zod_validator';
import { z, ZodRawShape } from 'zod';
import {
  zodStringToNumber,
  zodStringToNumberWithDefault,
  zodTimestampInSeconds,
} from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { CertificateSortBy } from '@/constants/certificate'; // Info: (20241023 - tzuhan) @Murky, 這裡要改成 SORT_BY （已經定義好）
import { SortOrder } from '@/constants/sort';

const certificateListQueryValidator = z.object({
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  hasBeenUsed: z.boolean().optional(),
  // type: z.string(), // Info: (20241022 - tzuhan) @Murky, 需要新增 type: z.enum(['All', 'Invoice', 'Receipt']),
  sortBy: z.nativeEnum(CertificateSortBy).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  startDate: zodTimestampInSeconds(true, 0),
  endDate: zodTimestampInSeconds(true, Infinity),
  searchQuery: z.string().optional(),
});

const certificateListBodyValidator = z.object({});

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
  (typeof certificateListQueryValidator)['shape'],
  (typeof certificateListBodyValidator)['shape']
> = {
  query: certificateListQueryValidator,
  body: certificateListBodyValidator,
};

const certificateGetOneQueryValidator = z.object({
  certificateId: zodStringToNumber,
});

const certificateGetOneBodyValidator = z.object({});

export const certificateGetOneValidator: IZodValidator<
  (typeof certificateGetOneQueryValidator)['shape'],
  (typeof certificateGetOneBodyValidator)['shape']
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

export const certificateRequestValidators: {
  [method: string]: IZodValidator<ZodRawShape, ZodRawShape>;
} = {
  GET_ONE: certificateGetOneValidator,
  PUT: certificatePutValidator,
  POST: certificatePostValidator,
  DELETE: certificateDeleteValidator,
  GET_LIST: certificateListValidator,
};

/**
 * Info: (20241025 - Murky)
 * @description schema for init certificate entity or parsed prisma certificate
 * @todo file, invoice, company, vouchers should be implemented
 */
export const certificateEntityValidator = z.object({
  id: z.number(),
  companyId: z.number(),
  voucherNo: z.string().nullable(),
  aiResultId: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
  aiStatus: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  file: z.any().optional(),
  invoice: z.any().optional(),
  company: z.any().optional(),
  vouchers: z.array(z.any()).optional(),
});
