import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';
import { zodStringToNumberWithDefault, zodTimestampInSeconds } from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { SortOrder } from '@/constants/sort';

const ledgerListQueryValidator = z.object({
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  startDate: zodTimestampInSeconds(true, 0),
  endDate: zodTimestampInSeconds(true, Infinity),
  startAccountNo: z.string().optional(),
  endAccountNo: z.string().optional(),
  labelType: z.enum(['general', 'detailed', 'all']).optional(),
});

export const ledgerReturnValidator = z.object({
  id: z.number(),
  voucherDate: z.number(),
  no: z.string(),
  accountingTitle: z.string(),
  voucherNumber: z.string(),
  particulars: z.string(),
  debitAmount: z.number(),
  creditAmount: z.number(),
  balance: z.number(),
  createAt: z.number(),
  updateAt: z.number(),
});

export const ledgerListReturnValidator = z.object({
  currency: z.string(),
  items: z.object({
    data: z.array(ledgerReturnValidator),
    page: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    pageSize: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    sort: z.array(
      z.object({
        sortBy: z.string(),
        sortOrder: z.string(),
      })
    ),
  }),
  totalDebitAmount: z.number(),
  totalCreditAmount: z.number(),
});

export const ledgerListValidator: IZodValidator<
  (typeof ledgerListQueryValidator)['shape'],
  z.ZodOptional<z.ZodNullable<z.ZodString>>
> = {
  query: ledgerListQueryValidator,
  body: z.string().nullable().optional(),
};
